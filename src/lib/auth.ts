import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getMongoDb } from "@/lib/mongodb";

type AuthInstance = ReturnType<typeof createAuthInstance>;

let authInstance: AuthInstance | null = null;

/**
 * Origins allowed to drive state-changing auth requests (sign-in, sign-out).
 *
 * Better Auth rejects any such POST whose `Origin` header is not trusted with
 * `403 INVALID_ORIGIN`, and its default trust list contains only the origin of
 * BETTER_AUTH_URL. That default breaks the app whenever it is served from a
 * different origin than the one pinned in the environment — the classic case
 * being a dev server that is not on port 3000. Session cookies ignore ports,
 * so the user still looks signed in while every auth POST fails, which is what
 * made logout report "Could not log out right now".
 *
 * Loopback origins are therefore trusted in non-production, and deployments
 * can extend the list with the comma-separated BETTER_AUTH_TRUSTED_ORIGINS
 * variable. Production still trusts only what is explicitly configured.
 */
function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (baseUrl) {
    origins.add(baseUrl);
  }

  for (const entry of (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    const origin = entry.trim();
    if (origin) {
      origins.add(origin);
    }
  }

  // Any port on the loopback host, but only outside production.
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:*");
    origins.add("http://127.0.0.1:*");
    origins.add("http://[::1]:*");
  }

  return [...origins];
}

function createAuthInstance() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Generate one with `npx @better-auth/cli secret` and add it to .env.local (server-only).",
    );
  }

  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: getTrustedOrigins(),
    database: mongodbAdapter(getMongoDb()),
    // Password recovery is handled personally by the app owner (see
    // `npm run recover:account`); there is no email-based reset flow.
    emailAndPassword: {
      enabled: true,
    },
  });
}

/**
 * Better Auth server instance (server-only).
 *
 * - V1 scope: email + password only. No social login, 2FA, or roles.
 * - Sessions are persistent and stored server-side via the MongoDB adapter;
 *   the browser only ever holds an http-only session cookie.
 * - Passwords are hashed by Better Auth — plaintext passwords are never
 *   stored or logged.
 * - Initialized lazily on first request so missing env vars fail with a clear
 *   message at request time instead of breaking `next build`.
 * - BETTER_AUTH_SECRET and MONGODB_URI must NEVER reach the browser.
 */
export function getAuth(): AuthInstance {
  if (authInstance) {
    return authInstance;
  }

  authInstance = createAuthInstance();
  return authInstance;
}
