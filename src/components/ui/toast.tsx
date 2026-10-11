"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import type { Toast, ToastKind } from "@/app/spendly-provider";

const iconByKind: Record<ToastKind, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} aria-hidden="true">
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} aria-hidden="true">
      <path d="M12 9v4.5" />
      <path d="M12 17h.01" />
      <path d="M10.5 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.5 3.8a2 2 0 0 0-3 0Z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M11 11.5h1v5h1" />
    </svg>
  ),
};

// Tone surfaces read from CSS variables so they follow the app's data-theme
// (light/dark/system) instead of Tailwind's OS-driven `dark:` variant.
const toneClass: Record<ToastKind, string> = {
  success:
    "border border-[var(--toast-success-border)] bg-[var(--toast-success-bg)] text-[var(--toast-success-fg)]",
  error:
    "border border-[var(--toast-error-border)] bg-[var(--toast-error-bg)] text-[var(--toast-error-fg)]",
  info: "border border-[var(--toast-info-border)] bg-[var(--toast-info-bg)] text-[var(--toast-info-fg)]",
};

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return null;
  }

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-40 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-auto sm:bottom-auto sm:right-4 sm:top-4 sm:items-end lg:bottom-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-2xl p-4 shadow-soft animate-in",
            toneClass[toast.kind],
          )}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 opacity-90">
              {iconByKind[toast.kind]}
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-semibold leading-5">{toast.title}</p>
              {toast.description ? (
                <p className="text-xs leading-5 opacity-90">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-lg px-1.5 py-1 text-xs opacity-70 transition-opacity hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
