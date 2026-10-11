"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Segment error boundary. It renders inside the root layout (which already owns
 * <html>/<body>), so it must only output page content — emitting another
 * document here breaks HTML nesting and logs hydration errors.
 */
export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      role="alert"
      className="flex min-h-[60vh] w-full items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Spendly hit an unexpected problem.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Your saved expenses are safe. Try loading this view again — if it keeps
          failing, reload the page. The details were logged for debugging.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
