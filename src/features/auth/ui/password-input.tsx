"use client";

import { useState, type ReactNode } from "react";

import { FieldLabel, FieldMessage, TextInput } from "@/components/ui/form-fields";

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  /** Optional right-aligned action rendered next to the label (e.g. Forgot password link). */
  labelAction?: ReactNode;
};

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.2 12s3.4-5.6 8.8-5.6c1.3 0 2.5.32 3.6.84M20.8 12s-3.4 5.6-8.8 5.6c-1.3 0-2.5-.32-3.6-.84" />
      <path d="M4.5 4.5l15 15" />
      <path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9" />
    </svg>
  );
}

export function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  error,
  required,
  placeholder,
  labelAction,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;
  const toggleLabel = `Show ${label.toLowerCase()}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
        {labelAction}
      </div>
      <div className="relative">
        <TextInput
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          className="pr-12!"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : toggleLabel}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? <FieldMessage id={errorId}>{error}</FieldMessage> : null}
    </div>
  );
}
