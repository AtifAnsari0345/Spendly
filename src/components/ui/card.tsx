import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
