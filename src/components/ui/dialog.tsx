"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hasAttribute("hidden") &&
      element.getAttribute("aria-hidden") !== "true",
  );
}

type DialogProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /**
   * Optional selector (resolved inside the dialog) for the element that
   * should receive focus when the dialog opens, e.g. the first form field.
   * When omitted, the first focusable element is focused.
   */
  initialFocus?: string;
}>;

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  initialFocus,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Move focus into the dialog on open and return it to the trigger on close.
  // The trigger is captured before anything inside the dialog can take focus.
  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;
    const active = document.activeElement;
    restoreFocusRef.current =
      active instanceof HTMLElement && !(panel && panel.contains(active))
        ? active
        : null;

    if (panel && !panel.contains(active)) {
      const preferred = initialFocus
        ? panel.querySelector<HTMLElement>(initialFocus)
        : null;
      const firstFocusable = focusableWithin(panel)[0];
      (preferred ?? firstFocusable ?? panel).focus();
    }

    return () => {
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (target && document.contains(target)) {
        target.focus();
      }
    };
  }, [open, initialFocus]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  // Keep Tab and Shift+Tab cycling inside the panel while the dialog is open.
  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusable = focusableWithin(panel);
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const outsidePanel = !active || !panel.contains(active);

    if (event.shiftKey) {
      if (active === first || active === panel || outsidePanel) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last || active === panel || outsidePanel) {
      event.preventDefault();
      first.focus();
    }
  }

  const sizeClass: Record<NonNullable<DialogProps["size"]>, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative max-h-full w-full overflow-y-auto rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft outline-none sm:rounded-[var(--radius-card)]",
          sizeClass[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="space-y-1">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm leading-5 text-[var(--color-muted-foreground)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  confirming?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  confirming = false,
}: ConfirmDialogProps) {
  const confirmVariant = tone === "danger" ? "primary" : "primary";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            disabled={confirming}
            onClick={() => {
              void (async () => {
                await onConfirm();
              })();
            }}
            className={tone === "danger" ? "bg-[var(--color-danger)]" : undefined}
          >
            {confirming ? "Please wait…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-6 text-[var(--color-muted-foreground)]">
        {description}
      </div>
    </Dialog>
  );
}
