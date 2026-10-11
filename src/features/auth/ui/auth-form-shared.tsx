/**
 * Shared, presentation-only pieces for the auth screens.
 * Pure helpers/components — safe in both server and client bundles.
 */

import { siteConfig } from "@/config/site";
import { LinkedinIcon } from "@/features/auth/ui/brand-icons";

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type AuthErrorShape = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

/** Maps Better Auth error payloads to short, human-friendly copy. */
export function friendlyAuthError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Something went wrong. Please try again.";
  }

  const { message, code, status } = error as AuthErrorShape;
  const text = typeof message === "string" ? message : "";
  const errCode = typeof code === "string" ? code : "";
  const statusCode = typeof status === "number" ? status : 0;

  if (statusCode === 429 || /too many|rate ?limit/i.test(text)) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (
    statusCode === 401 ||
    errCode.includes("INVALID") ||
    /invalid (?:email|password|credentials)|incorrect password/i.test(text)
  ) {
    return "That email and password do not match an account.";
  }
  if (errCode.includes("EXIST") || /already exists/i.test(text)) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (/password/i.test(text) && /(?:\b8\b|characters|short|weak)/i.test(text)) {
    return "Use a password with at least 8 characters.";
  }
  if (/fetch|network|connect/i.test(text)) {
    return "Could not reach Spendly. Check your connection and try again.";
  }
  if (text) {
    return text;
  }
  return "Could not complete the request. Please try again.";
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 px-4 py-3 text-sm leading-5 text-[var(--color-danger)]"
    >
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" />
        <circle cx="12" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

/**
 * Owner-assisted recovery message for the /forgot-password screen.
 *
 * Spendly deliberately has no email-based password reset. Recovery is handled
 * personally by the app owner, so this note mentions no email, links, tokens or
 * providers — just a human to reach when access is needed.
 */
export function AuthHelpNote() {
  return (
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
      Need help accessing your account?{" "}
      <a
        href={siteConfig.links.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        title="LinkedIn (opens in a new tab)"
        className="group rounded align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
      >
        {/* Colour and underline live on this span: the global
            `a { color: inherit }` reset outranks utility classes. */}
        <span className="inline-flex items-center gap-1.5 align-middle font-semibold text-[var(--color-accent)] underline-offset-4 group-hover:underline">
          <LinkedinIcon size={14} />
          Contact the app owner for assistance.
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>{" "}
      The app owner can securely recover your existing account without affecting
      your saved expenses or settings.
    </p>
  );
}
