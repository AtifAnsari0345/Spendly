"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/form-fields";
import { authClient } from "@/lib/auth-client";
import {
  AuthErrorBanner,
  AuthHeading,
  Spinner,
  friendlyAuthError,
  isValidEmail,
} from "@/features/auth/ui/auth-form-shared";
import { PasswordInput } from "@/features/auth/ui/password-input";

type FieldErrors = {
  email?: string;
  password?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = "Enter your email address.";
    } else if (!isValidEmail(email)) {
      next.email = "That does not look like a valid email address.";
    }
    if (!password) {
      next.password = "Enter your password.";
    }
    return next;
  }

  function updateEmail(value: string) {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: undefined }));
    if (banner) setBanner(null);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: undefined }));
    if (banner) setBanner(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setBanner(null);
    const next = validate();
    setErrors(next);

    if (next.email) {
      document.getElementById("login-email")?.focus();
      return;
    }
    if (next.password) {
      document.getElementById("login-password")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (error) {
        setBanner(friendlyAuthError(error));
        return;
      }
      router.push("/");
    } catch {
      setBanner(friendlyAuthError(null));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-busy={submitting}
      className="space-y-5"
    >
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to pick up where you left off."
      />

      {banner ? <AuthErrorBanner message={banner} /> : null}

      <div className="space-y-1.5">
        <FieldLabel htmlFor="login-email" required>
          Email
        </FieldLabel>
        <TextInput
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@example.com"
          required
          value={email}
          onChange={(event) => updateEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
        />
        {errors.email ? (
          <p
            id="login-email-error"
            className="mt-1 text-xs text-[var(--color-danger)]"
          >
            {errors.email}
          </p>
        ) : null}
      </div>

      <PasswordInput
        id="login-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={updatePassword}
        error={errors.password}
        labelAction={
          <Link
            href="/forgot-password"
            className="rounded text-xs font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            Forgot password?
          </Link>
        }
      />

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Spinner />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        New to Spendly?{" "}
        <Link
          href="/sign-up"
          className="rounded font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
