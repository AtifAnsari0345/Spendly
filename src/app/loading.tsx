export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
          Loading
        </p>
        <div className="mt-4 space-y-3">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="h-3 w-full animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--color-border)]" />
        </div>
      </div>
    </div>
  );
}
