"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren, ReactNode } from "react";

import { useSpendly } from "@/app/spendly-provider";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/cn";

type IconName = "dashboard" | "expenses" | "analytics" | "reports" | "settings";

const iconByPath: Record<string, IconName> = {
  "/": "dashboard",
  "/expenses": "expenses",
  "/analytics": "analytics",
  "/reports": "reports",
  "/settings": "settings",
};

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { openAddModal } = useSpendly();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 lg:flex lg:flex-col">
          <BrandMark />
          <nav className="mt-10 space-y-2" aria-label="Primary">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors",
                    isActive
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <NavIcon active={isActive} name={iconByPath[item.href]} />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs leading-5">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Fast Capture Focus
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Open the app, add an expense, and immediately see updated totals.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 backdrop-blur lg:px-8 lg:py-4">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
              <BrandMark compact className="lg:hidden" />
              <Button className="ml-auto shrink-0 max-lg:hidden" onClick={openAddModal}>
                Add Expense
              </Button>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 pb-28 lg:px-8 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition-colors",
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted-foreground)]",
                )}
              >
                <NavIcon active={isActive} name={iconByPath[item.href]} />
                <span className="text-[11px] font-medium">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <button
        type="button"
        onClick={openAddModal}
        aria-label="Add expense"
        className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-soft ring-1 ring-black/5 transition-transform active:scale-95 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] lg:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          width={26}
          height={26}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.2}
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

function NavIcon({ active, name }: { active: boolean; name: IconName }) {
  const commonProps = {
    className: cn(
      "h-5 w-5",
      active ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]",
    ),
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  const icons: Record<IconName, ReactNode> = {
    dashboard: (
      <svg {...commonProps}>
        <path d="M4 12.5 12 5l8 7.5" />
        <path d="M6.5 10.5V19h11v-8.5" />
      </svg>
    ),
    expenses: (
      <svg {...commonProps}>
        <path d="M6 4.5h12v15H6z" />
        <path d="M9 8.5h6M9 12h6M9 15.5h4" />
      </svg>
    ),
    analytics: (
      <svg {...commonProps}>
        <path d="M5 18.5h14" />
        <path d="M8 16V11" />
        <path d="M12 16V7.5" />
        <path d="M16 16v-5" />
      </svg>
    ),
    reports: (
      <svg {...commonProps}>
        <path d="M7 4.5h7l3 3V19H7z" />
        <path d="M14 4.5V8h3" />
        <path d="M10 12.5h4M10 15.5h4" />
      </svg>
    ),
    settings: (
      <svg {...commonProps}>
        <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3.7a7 7 0 0 0-1.7-1L14.5 3h-5L9 5.7a7 7 0 0 0-1.7 1L5 6l-2 3.5L5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.3-.7a7 7 0 0 0 1.7 1l.5 2.7h5l.4-2.7a7 7 0 0 0 1.7-1L19 18l2-3.5-2-1.5c.1-.3.1-.6.1-1Z" />
      </svg>
    ),
  };

  return <span aria-hidden="true">{icons[name]}</span>;
}
