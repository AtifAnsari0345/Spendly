export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
};

export const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Home",
    description: "High-level spending overview and quick-add entry point.",
  },
  {
    href: "/expenses",
    label: "Expenses",
    shortLabel: "Expenses",
    description: "Expense entry, list management, search, and filters.",
  },
  {
    href: "/analytics",
    label: "Analytics",
    shortLabel: "Insights",
    description: "Deterministic calculations, charts, and spending trends.",
  },
  {
    href: "/reports",
    label: "Reports",
    shortLabel: "Reports",
    description: "Monthly and yearly reporting plus export workflows.",
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    description: "Account, appearance, currency, and categories.",
  },
];
