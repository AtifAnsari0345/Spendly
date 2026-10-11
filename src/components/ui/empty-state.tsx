import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "flex flex-col justify-between gap-4",
        compact ? "px-4 py-4 sm:px-5 sm:py-5" : "gap-5",
      )}
    >
      <div className={cn("space-y-3", compact ? "space-y-2" : "")}>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
          {eyebrow}
        </p>
        <div className={cn("space-y-2", compact ? "space-y-1.5" : "")}>
          <h2
            className={cn(
              "font-semibold tracking-tight text-[var(--color-foreground)]",
              compact ? "text-base sm:text-lg" : "text-xl",
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "leading-6 text-[var(--color-muted-foreground)]",
              compact ? "max-w-xl text-xs sm:text-sm" : "max-w-2xl text-sm",
            )}
          >
            {description}
          </p>
        </div>
      </div>
      {action ? <div className={cn(compact ? "pt-1" : "")}>{action}</div> : null}
    </Card>
  );
}
