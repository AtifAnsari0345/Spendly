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
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

const FIELD_ORDER: Array<{ key: keyof FieldErrors; id: string }> = [
  { key: "name", id: "signup-name" },
  { key: "email", id: "signup-email" },
  { key: "password", id: "signup-password" },
  { key: "confirm", id: "signup-confirm" },
];

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) {
      next.name = "Enter your name.";
    } else if (name.trim().length > 80) {
      next.name = "Keep your name under 80 characters.";
    }
    if (!email.trim()) {
      next.email = "Enter your email address.";
    } else if (!isValidEmail(email)) {
      next.email = "That does not look like a valid email address.";
    }
    if (!password) {
      next.password = "Create a password.";
    } else if (password.length < 8) {
      next.password = "Use a password with at least 8 characters.";
    }
    if (!confirm) {
      next.confirm = "Confirm your password.";
    } else if (confirm !== password) {
      next.confirm = "Passwords do not match.";
    }
    return next;
  }

  function clearField(key: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (banner) setBanner(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setBanner(null);
    const next = validate();
    setErrors(next);

    const firstInvalid = FIELD_ORDER.find((field) => next[field.key]);
    if (firstInvalid) {
      document.getElementById(firstInvalid.id)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await authClient.signUp.email({
        name: name.trim(),
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
        title="Create your account"
        subtitle="A private space for your spending, yours alone."
      />

      {banner ? <AuthErrorBanner message={banner} /> : null}

      <div className="space-y-1.5">
        <FieldLabel htmlFor="signup-name" required>
          Name
        </FieldLabel>
        <TextInput
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          maxLength={80}
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clearField("name");
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "signup-name-error" : undefined}
        />
        {errors.name ? (
          <p
            id="signup-name-error"
            className="mt-1 text-xs text-[var(--color-danger)]"
          >
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="signup-email" required>
          Email
        </FieldLabel>
        <TextInput
          id="signup-email"
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
          onChange={(event) => {
            setEmail(event.target.value);
            clearField("email");
          }}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "signup-email-error" : undefined}
        />
        {errors.email ? (
          <p
            id="signup-email-error"
            className="mt-1 text-xs text-[var(--color-danger)]"
          >
            {errors.email}
          </p>
        ) : null}
      </div>

      <PasswordInput
        id="signup-password"
        name="password"
        label="Password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        required
        value={password}
        onChange={(value) => {
          setPassword(value);
          clearField("password");
        }}
        error={errors.password}
      />

      <PasswordInput
        id="signup-confirm"
        name="confirm"
        label="Confirm password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(value) => {
          setConfirm(value);
          clearField("confirm");
        }}
        error={errors.confirm}
      />

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Spinner />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="rounded font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
