import type { HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold tracking-wide text-[var(--color-foreground)]"
    >
      {children}
      {required ? <span className="ml-0.5 text-[var(--color-danger)]">*</span> : null}
    </label>
  );
}

export function FieldMessage({
  children,
  tone = "error",
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement> & {
  tone?: "error" | "hint";
}) {
  return (
    <p
      {...rest}
      className={cn(
        "mt-1 text-xs",
        tone === "error"
          ? "text-[var(--color-danger)]"
          : "text-[var(--color-muted-foreground)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

const inputBase =
  "w-full min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60";

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function NumberInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      inputMode="decimal"
      className={cn(inputBase, className)}
      {...props}
    />
  );
}

export function DateInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="date"
      className={cn(inputBase, className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(inputBase, "appearance-none bg-none pr-10", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      className={cn(inputBase, "resize-y py-2.5", className)}
      {...props}
    />
  );
}
