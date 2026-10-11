#!/usr/bin/env node
/**
 * Spendly — owner-only account recovery (private, server-side only).
 *
 * WHY THIS EXISTS
 *   If a user can no longer receive the normal password-reset email (mailbox
 *   gone, mail filtered, provider trouble), the owner can still hand them back
 *   their EXISTING account. The account keeps its user id, expenses, categories
 *   and settings — only the password changes.
 *
 * HOW TO RUN (from the project root, with the real .env.local in place)
 *   npm run recover:account -- --email user@example.com --confirm
 *       Prompts for the temporary password (hidden input) and applies it.
 *
 *   npm run recover:account -- --email user@example.com
 *       Report only — shows the account and its data, writes nothing.
 *
 *   npm run recover:account -- --email user@example.com --confirm --keep-sessions
 *       Keeps the account's existing sessions instead of revoking them.
 *
 *   The password may also be piped in (never passed as an argument):
 *       printf '%s\n' "$TEMP_PASSWORD" | npm run recover:account -- --email user@example.com --confirm
 *
 * SAFEGUARDS
 *   - Private: this file lives outside src/, is never imported by application
 *     code, and is not exposed through any route, page or API — there is no
 *     admin panel to reach it through.
 *   - Explicit: without --confirm the tool only reports and exits, so it can
 *     never change a password by accident.
 *   - Existing accounts only: it looks the user up and refuses when there is no
 *     match, so it can never create an account.
 *   - Official API: password hashing and the write both go through Better Auth's
 *     own server-side API (context.password.hash and
 *     internalAdapter.updatePassword) — the same path Better Auth's own
 *     reset-password endpoint uses. Hashes are never written by hand.
 *   - The temporary password is read from a hidden prompt or piped stdin. It is
 *     never taken from a flag, never printed, never logged, and never stored
 *     anywhere except as the account's password hash.
 *   - Weak or risky passwords are refused: shorter than 8 characters (the app's
 *     own rule), surrounded by whitespace, or identical to the current one.
 *   - Existing sessions are revoked by default, so any device still holding a
 *     session must sign in again with the new password.
 *   - Afterwards the tool re-reads the account, verifies the new password
 *     against the stored hash, and confirms the user id and the counts of
 *     expenses, categories and settings are unchanged.
 */

import process, { argv, stdin, stdout } from "node:process";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

/** Matches the rule enforced by the sign-up and reset-password forms. */
const MIN_PASSWORD_LENGTH = 8;

/** Collection names mirroring src/lib/mongo/documents.ts (read-only checks). */
const EXPENSES_COLLECTION = "expenses";
const CATEGORIES_COLLECTION = "categories";
const USER_PREFERENCES_COLLECTION = "user_preferences";

/** An expected, reportable failure (as opposed to an unexpected crash). */
class RecoveryError extends Error {}

/**
 * Removes anything credential-shaped from a string before it can be printed:
 * `user:password@` in a connection string, and long opaque values such as
 * session tokens. Provider errors often quote the input back at us.
 */
function redact(value) {
  return String(value)
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1<credentials hidden>@")
    .replace(/[A-Za-z0-9_-]{24,}/g, "<value hidden>");
}

/** Hosts and database name only — never the credentials in the URI. */
function describeTarget(uri) {
  const match = /^(mongodb(?:\+srv)?:\/\/)(?:[^@/]*@)?([^/?]+)(?:\/([^?]+))?/i.exec(uri);
  if (!match) {
    return "<unrecognized connection string>";
  }
  return `${match[1]}${match[2]}/${match[3] ?? "<default database>"}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function printUsage() {
  console.log(`Spendly owner account recovery — private server-side tool

Usage:
  npm run recover:account -- --email <address> [--confirm] [--keep-sessions]

Options:
  --email <address>  The EXISTING account to recover (required).
  --confirm          Apply the password change. Without it nothing is written.
  --keep-sessions    Keep the account's current sessions (default: revoke them).
  --help             Show this message.

The temporary password is entered at a hidden prompt, or piped in on stdin.
It is never accepted as a flag, never printed and never logged.`);
}

function parseArgs(args) {
  const options = {
    email: "",
    confirm: false,
    keepSessions: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--email") {
      options.email = (args[index + 1] ?? "").trim();
      index += 1;
    } else if (arg === "--confirm") {
      options.confirm = true;
    } else if (arg === "--keep-sessions") {
      options.keepSessions = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new RecoveryError(`Unknown argument "${arg}". Run with --help.`);
    }
  }

  return options;
}

/** Hidden input on a TTY; echo is suppressed so the password stays off screen. */
function askHidden(question) {
  return new Promise((resolve, reject) => {
    stdout.write(question);

    const wasRaw = stdin.isRaw === true;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const finish = (result, error) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\u0003" || char === "\u0004") {
          finish(null, new RecoveryError("Cancelled — nothing was changed."));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        // Ignore control characters and escape sequences (arrow keys, paste).
        if (char >= " ") {
          value += char;
        }
      }
    }

    stdin.on("data", onData);
  });
}

/** Reads piped input when there is no terminal: one line, or password + confirmation. */
async function readPipedLines() {
  const chunks = [];
  for await (const chunk of stdin) {
    chunks.push(chunk);
  }
  const lines = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

/**
 * Collects the temporary password without ever putting it on the command line.
 * When input is piped, a second line is treated as the confirmation.
 */
async function readTemporaryPassword() {
  if (!stdin.isTTY) {
    const lines = await readPipedLines();
    if (lines.length === 0) {
      throw new RecoveryError(
        "No password was provided on stdin. Run the tool in a terminal to be prompted.",
      );
    }
    if (lines.length > 1 && lines[0] !== lines[1]) {
      throw new RecoveryError("The two piped password lines do not match.");
    }
    return lines[0];
  }

  const first = await askHidden("Temporary password (hidden): ");
  const second = await askHidden("Repeat it to confirm    (hidden): ");
  if (first !== second) {
    throw new RecoveryError("The two passwords do not match — nothing was changed.");
  }
  return first;
}

async function assertPasswordIsUsable(password, currentHash, verify) {
  if (!password) {
    throw new RecoveryError("The password was empty — nothing was changed.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new RecoveryError(
      `Use at least ${MIN_PASSWORD_LENGTH} characters — the sign-in screen enforces the same rule.`,
    );
  }
  if (password !== password.trim()) {
    throw new RecoveryError(
      "The password starts or ends with whitespace, which is easy to mistype. Remove it and try again.",
    );
  }
  if (await verify({ hash: currentHash, password })) {
    throw new RecoveryError(
      "That is already the account's current password. Choose a different temporary password.",
    );
  }
}

async function main() {
  const options = parseArgs(argv.slice(2));

  if (options.help) {
    printUsage();
    return 0;
  }

  if (!options.email) {
    printUsage();
    return 2;
  }

  if (!isValidEmail(options.email)) {
    throw new RecoveryError(`"${options.email}" is not a valid email address.`);
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new RecoveryError(
      "MONGODB_URI is not set. Run this through npm (it loads .env.local) or export it first.",
    );
  }

  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new RecoveryError(
      "BETTER_AUTH_SECRET is not set — point this at the same environment as the app (npm run loads .env.local).",
    );
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  const database = client.db();

  const auth = betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL?.trim(),
    database: mongodbAdapter(database, { client }),
    // Same email/password settings the app uses, so hashes stay compatible.
    emailAndPassword: { enabled: true },
    // This tool must never phone home.
    telemetry: { enabled: false },
  });

  try {
    const context = await auth.$context;

    console.log("Spendly owner account recovery — private server-side tool");
    console.log(`Target database : ${describeTarget(uri)}`);
    console.log(`Account         : ${options.email}`);

    let found = await context.internalAdapter.findUserByEmail(options.email, {
      includeAccounts: true,
    });
    if (!found) {
      const lowered = options.email.toLowerCase();
      if (lowered !== options.email) {
        found = await context.internalAdapter.findUserByEmail(lowered, {
          includeAccounts: true,
        });
      }
    }

    if (!found) {
      throw new RecoveryError(
        `No existing account matches ${options.email}. This tool never creates accounts.`,
      );
    }

    const userId = found.user.id;
    const since = {
      expenses: await database.collection(EXPENSES_COLLECTION).countDocuments({ userId }),
      categories: await database.collection(CATEGORIES_COLLECTION).countDocuments({ userId }),
      preferences: await database
        .collection(USER_PREFERENCES_COLLECTION)
        .countDocuments({ _id: userId }),
    };

    const credential = await context.internalAdapter.findCredentialAccount(userId);
    if (!credential?.password) {
      throw new RecoveryError(
        "That account has no email/password credential, so there is nothing to reset. It was not modified.",
      );
    }

    const sessions = await context.internalAdapter.listSessions(userId);

    console.log(`Name            : ${found.user.name ?? "<none>"}`);
    console.log(`User id         : ${userId}   (preserved)`);
    console.log(`Created         : ${new Date(found.user.createdAt).toISOString()}`);
    console.log(
      `Owned data      : ${since.expenses} expenses, ${since.categories} categories, ` +
        `settings ${since.preferences > 0 ? "present" : "absent"}`,
    );
    console.log(
      `Sessions        : ${sessions.length}` +
        (options.keepSessions ? " (kept)" : " (will be revoked)"),
    );

    if (!options.confirm) {
      console.log(
        "\nReport only — no password was changed. Re-run with --confirm to apply the recovery.",
      );
      return 0;
    }

    const password = await readTemporaryPassword();
    await assertPasswordIsUsable(password, credential.password, (input) =>
      context.password.verify(input),
    );

    const nextHash = await context.password.hash(password);
    await context.internalAdapter.updatePassword(userId, nextHash);

    let revoked = 0;
    if (!options.keepSessions) {
      await context.internalAdapter.deleteUserSessions(userId);
      revoked = sessions.length;
    }

    const after = await context.internalAdapter.findUserById(userId);
    const updatedCredential = await context.internalAdapter.findCredentialAccount(userId);
    const verified = await context.password.verify({
      hash: updatedCredential?.password ?? "",
      password,
    });
    const now = {
      expenses: await database.collection(EXPENSES_COLLECTION).countDocuments({ userId }),
      categories: await database.collection(CATEGORIES_COLLECTION).countDocuments({ userId }),
      preferences: await database
        .collection(USER_PREFERENCES_COLLECTION)
        .countDocuments({ _id: userId }),
    };

    const preserved =
      after?.id === userId &&
      now.expenses === since.expenses &&
      now.categories === since.categories &&
      now.preferences === since.preferences;

    console.log("\n✔ Password updated");
    console.log(`  sign-in with the new password : ${verified ? "verified" : "FAILED"}`);
    console.log(
      `  user id unchanged             : ${after?.id === userId ? "yes" : "NO"} (${userId})`,
    );
    console.log(`  expenses unchanged            : ${now.expenses} (was ${since.expenses})`);
    console.log(`  categories unchanged          : ${now.categories} (was ${since.categories})`);
    console.log(
      `  settings unchanged            : ${now.preferences > 0 ? "yes" : "absent"} (was ${
        since.preferences > 0 ? "present" : "absent"
      })`,
    );
    console.log(
      `  existing sessions             : ${options.keepSessions ? "kept" : `revoked (${revoked})`}`,
    );

    if (!verified || !preserved) {
      throw new RecoveryError(
        "The account state is not what this tool expects — inspect the account before handing out the password.",
      );
    }

    console.log(
      "\nNext: give the temporary password to the account owner over a safe channel and ask them" +
        "\nto sign in and set their own password. Nothing was logged except what is printed above.",
    );
    return 0;
  } finally {
    await client.close();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const message =
      error instanceof RecoveryError ? error.message : redact(error?.message ?? error);
    console.error(`\n✖ Recovery failed: ${message}`);
    process.exitCode = 1;
  });
