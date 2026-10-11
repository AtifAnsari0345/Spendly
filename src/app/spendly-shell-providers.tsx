"use client";

import type { ReactNode } from "react";

import { SpendlyProvider, useSpendly } from "@/app/spendly-provider";
import { Dialog } from "@/components/ui/dialog";
import { ToastViewport } from "@/components/ui/toast";
import { ExpenseForm } from "@/features/expenses/ui/expense-form";

function GlobalExpenseDialogs() {
  const {
    addModalOpen,
    closeModals,
    editingExpense,
  } = useSpendly();

  return (
    <>
      <Dialog
        open={addModalOpen}
        onClose={closeModals}
        size="md"
        title="Add expense"
        description="Record a new spending entry. Totals and lists update instantly after saving."
      >
        <ExpenseForm
          onSuccess={() => closeModals()}
          onCancel={closeModals}
          submitLabel="Save expense"
        />
      </Dialog>

      <Dialog
        open={Boolean(editingExpense)}
        onClose={closeModals}
        size="md"
        title="Edit expense"
        description="Update the details below. All saved changes apply immediately to reports and totals."
      >
        {editingExpense ? (
          <ExpenseForm
            initial={editingExpense}
            onSuccess={() => closeModals()}
            onCancel={closeModals}
            submitLabel="Save changes"
          />
        ) : null}
      </Dialog>
    </>
  );
}

function GlobalToasts() {
  const { toasts, dismissToast } = useSpendly();
  return <ToastViewport toasts={toasts} onDismiss={dismissToast} />;
}

/**
 * Mirrors the app/loading.tsx placeholder while the authenticated user's
 * initial MongoDB load runs, so pages never flash an empty state that
 * could be mistaken for another account's data.
 */
function InitialLoadGate({ children }: { children: ReactNode }) {
  const { initialized } = useSpendly();

  if (!initialized) {
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

  return <>{children}</>;
}

export function SpendlyShellProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SpendlyProvider>
      <InitialLoadGate>{children}</InitialLoadGate>
      <GlobalExpenseDialogs />
      <GlobalToasts />
    </SpendlyProvider>
  );
}
