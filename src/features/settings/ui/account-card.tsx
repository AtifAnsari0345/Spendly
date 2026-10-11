"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type AccountCardProps = {
  /** Identity from the server-side Better Auth session — never from the client. */
  user: { name: string; email: string } | null;
};

/**
 * Sign-out is a plain fetch to Better Auth. Without a bound, a stalled request
 * left this button disabled on "Logging out…" forever — no error, no retry —
 * which is exactly what a failed logout looks like to the person clicking it.
 * Ten seconds is far longer than a healthy sign-out needs and still recovers
 * from a dead connection or an unreachable server.
 */
const SIGNOUT_TIMEOUT_MS = 10_000;

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("SIGNOUT_TIMEOUT"));
    }, timeoutMs);

    task.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (cause: unknown) => {
        window.clearTimeout(timer);
        reject(cause instanceof Error ? cause : new Error("SIGNOUT_FAILED"));
      },
    );
  });
}

export function AccountCard({ user }: AccountCardProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);

    try {
      const { error: signOutError } = await withTimeout(
        authClient.signOut(),
        SIGNOUT_TIMEOUT_MS,
      );

      if (signOutError) {
        setError("Could not log out right now. Please try again.");
        setSigningOut(false);
        return;
      }

      // Deliberate full navigation rather than a client-side route change: it
      // discards every cached authenticated tree and makes the browser request
      // /login with the now-cleared session cookie, so no signed-in view can
      // survive the logout. `replace` keeps this page out of the history stack.
      window.location.replace("/login");
    } catch {
      setError("Could not log out. Check your connection and try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-4 sm:px-5">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
          {user?.name || "Your account"}
        </p>
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          {user?.email || "Signed in to Spendly"}
        </p>
        {error ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        variant="secondary"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className="shrink-0"
      >
        {signingOut ? "Logging out…" : "Log out"}
      </Button>
    </div>
  );
}
