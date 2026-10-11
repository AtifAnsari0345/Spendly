import Link from "next/link";

import { AuthHeading, AuthHelpNote } from "@/features/auth/ui/auth-form-shared";

/**
 * Owner-assisted recovery screen for /forgot-password.
 *
 * Spendly has no email-based password reset, so there is nothing to submit and
 * no server call is made here. The screen only explains how to reach the app
 * owner, who restores access to the existing account without touching the
 * member's saved expenses or settings.
 */
export function ForgotPasswordForm() {
  return (
    <div className="space-y-5">
      <AuthHeading title="Forgot your password?" />

      <AuthHelpNote />

      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="rounded font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
