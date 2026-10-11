import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/cn";

type StatCardProps = PropsWithChildren<{
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "default" | "accent" | "success" | "warning";
  icon?: ReactNode;
}>;

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "",
  accent:
    "bg-gradient-to-br from-[var(--color-accent-soft)] via-transparent to-transparent",
  success:
    "bg-gradient-to-br from-emerald-50 via-transparent to-transparent",
  warning:
    "bg-gradient-to-br from-amber-50 via-transparent to-transparent",
};

export function StatCard({
  label,
  value,
  hint,
  accent = "default",
  icon,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-subtle",
        accentClasses[accent],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <div className="text-xs leading-5 text-[var(--color-muted-foreground)]">
              {hint}
            </div>
          ) : null}
        </div>
        {icon ? (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-subtle)] text-[var(--color-accent)] ring-1 ring-[var(--color-border)]">
            {icon}
          </span>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
