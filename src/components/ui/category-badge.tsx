import type { Category } from "@/features/categories/models/category";
import {
  CategoryIcon,
  resolveCategoryColor,
} from "@/features/categories/ui/category-visuals";
import { cn } from "@/lib/cn";

export function CategoryBadge({
  category,
  size = "md",
}: {
  category: Category;
  size?: "sm" | "md";
}) {
  const color = resolveCategoryColor(category.colorToken);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-[var(--color-surface-subtle)] text-[var(--color-foreground)]",
        color.border,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", color.dot)} aria-hidden />
      {category.name}
    </span>
  );
}

export function CategoryChip({
  category,
  onClick,
  selected,
}: {
  category: Category;
  onClick?: () => void;
  selected?: boolean;
}) {
  const color = resolveCategoryColor(category.colorToken);

  const interactive = typeof onClick === "function";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected
          ? cn(color.softBg, color.border, "text-[var(--color-foreground)] ring-1 ring-offset-0", `ring-${color.dot.replace("bg-", "")}-300`)
          : interactive
            ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-subtle)]"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] text-[var(--color-foreground)] cursor-default",
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full",
          color.softBg,
          color.fg,
        )}
      >
        <CategoryIcon icon={category.icon} size={16} />
      </span>
      <span className="font-medium">{category.name}</span>
    </button>
  );
}
