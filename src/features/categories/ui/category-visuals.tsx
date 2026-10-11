import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type CategoryColorKey =
  | "amber"
  | "emerald"
  | "sky"
  | "violet"
  | "rose"
  | "slate"
  | "red"
  | "indigo"
  | "orange"
  | "cyan"
  | "purple"
  | "pink"
  | "zinc";

type ColorTokenStyles = {
  bg: string;
  fg: string;
  dot: string;
  border: string;
  softBg: string;
};

const categoryColorMap: Record<CategoryColorKey, ColorTokenStyles> = {
  amber: {
    bg: "bg-amber-500 dark:bg-amber-400",
    fg: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-500/25",
    softBg: "bg-amber-50 dark:bg-amber-500/12",
  },
  emerald: {
    bg: "bg-emerald-500 dark:bg-emerald-400",
    fg: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200 dark:border-emerald-500/25",
    softBg: "bg-emerald-50 dark:bg-emerald-500/12",
  },
  sky: {
    bg: "bg-sky-500 dark:bg-sky-400",
    fg: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    border: "border-sky-200 dark:border-sky-500/25",
    softBg: "bg-sky-50 dark:bg-sky-500/12",
  },
  violet: {
    bg: "bg-violet-500 dark:bg-violet-400",
    fg: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    border: "border-violet-200 dark:border-violet-500/25",
    softBg: "bg-violet-50 dark:bg-violet-500/12",
  },
  rose: {
    bg: "bg-rose-500 dark:bg-rose-400",
    fg: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    border: "border-rose-200 dark:border-rose-500/25",
    softBg: "bg-rose-50 dark:bg-rose-500/12",
  },
  slate: {
    bg: "bg-slate-500 dark:bg-slate-400",
    fg: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-500",
    border: "border-slate-200 dark:border-slate-500/25",
    softBg: "bg-slate-50 dark:bg-slate-500/12",
  },
  red: {
    bg: "bg-red-500 dark:bg-red-400",
    fg: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
    border: "border-red-200 dark:border-red-500/25",
    softBg: "bg-red-50 dark:bg-red-500/12",
  },
  indigo: {
    bg: "bg-indigo-500 dark:bg-indigo-400",
    fg: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
    border: "border-indigo-200 dark:border-indigo-500/25",
    softBg: "bg-indigo-50 dark:bg-indigo-500/12",
  },
  orange: {
    bg: "bg-orange-500 dark:bg-orange-400",
    fg: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    border: "border-orange-200 dark:border-orange-500/25",
    softBg: "bg-orange-50 dark:bg-orange-500/12",
  },
  cyan: {
    bg: "bg-cyan-500 dark:bg-cyan-400",
    fg: "text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
    border: "border-cyan-200 dark:border-cyan-500/25",
    softBg: "bg-cyan-50 dark:bg-cyan-500/12",
  },
  purple: {
    bg: "bg-purple-500 dark:bg-purple-400",
    fg: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
    border: "border-purple-200 dark:border-purple-500/25",
    softBg: "bg-purple-50 dark:bg-purple-500/12",
  },
  pink: {
    bg: "bg-pink-500 dark:bg-pink-400",
    fg: "text-pink-700 dark:text-pink-300",
    dot: "bg-pink-500",
    border: "border-pink-200 dark:border-pink-500/25",
    softBg: "bg-pink-50 dark:bg-pink-500/12",
  },
  zinc: {
    bg: "bg-zinc-500 dark:bg-zinc-400",
    fg: "text-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-500",
    border: "border-zinc-200 dark:border-zinc-500/25",
    softBg: "bg-zinc-50 dark:bg-zinc-500/12",
  },
};

export type CategoryIconKey =
  | "utensils"
  | "basket"
  | "car"
  | "bag"
  | "receipt"
  | "home"
  | "pulse"
  | "book"
  | "spark"
  | "plane"
  | "refresh"
  | "user"
  | "dots";

export const categoryColorKeys = Object.keys(
  categoryColorMap,
) as CategoryColorKey[];

export function resolveCategoryColor(token: string): ColorTokenStyles {
  const key = token as CategoryColorKey;
  return categoryColorMap[key] ?? categoryColorMap.zinc;
}

type IconProps = {
  className?: string;
  size?: number;
};

const ICON_GRID = 24;

/**
 * Icons are drawn on a 24x24 grid and then scaled down to `size`, so every unit
 * is multiplied by size/24. A fixed stroke width therefore thins out: 1.8 units
 * is 1.2px on screen at 16px and only 0.9px at 12px, which anti-aliases into a
 * washed-out grey hairline. Compensating for the scale keeps the rendered stroke
 * at roughly 1.6px across the 16-24px range these icons are used at, while large
 * renders keep the natural 1.8 weight.
 */
function strokeWidthFor(size: number): number {
  const scaled = (1.6 * ICON_GRID) / size;
  return Math.round(Math.min(Math.max(scaled, 1.8), 2.5) * 100) / 100;
}

/**
 * Ships the glyph. Glyphs are stroke-only and share one weight, so a row of
 * category icons always reads as a single family.
 */
function IconSvg({
  className,
  size = 16,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidthFor(size)}
      width={size}
      height={size}
      className={cn("block shrink-0", className)}
    >
      {children}
    </svg>
  );
}

/**
 * Every glyph below is drawn inside the same keyline (roughly x/y 4-20 of the
 * 24x24 grid, visual centre at 12,12) with the fewest strokes that still read at
 * 16px, so icons of different subjects look the same size in a list.
 */
const iconComponents: Record<
  CategoryIconKey,
  (props: IconProps) => ReactNode
> = {
  // Fork + spoon: the head curves downward into a real U (sweep 0) and the two
  // utensils match in height, so it no longer reads as three parallel bars.
  utensils: (p) => (
    <IconSvg {...p}>
      <path d="M4.6 3.5v5.5a3 3 0 0 0 6 0V3.5" />
      <path d="M7.6 12v8.5" />
      <circle cx="16.4" cy="6.6" r="3.1" />
      <path d="M16.4 9.7v10.8" />
    </IconSvg>
  ),
  // Basket: straight rim plus a handle above it, with one inner line for detail.
  basket: (p) => (
    <IconSvg {...p}>
      <path d="M4.5 8.5h15l-1.3 10.2a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8L4.5 8.5Z" />
      <path d="M8.5 8.5 12 3.9l3.5 4.6" />
      <path d="M9.5 12.6h5" />
    </IconSvg>
  ),
  // Car: cabin, body and wheels, re-centred so the shape does not sink to the bottom.
  car: (p) => (
    <IconSvg {...p}>
      <path d="M6.4 10.9 8 7.1a2 2 0 0 1 1.9-1.3h4.2A2 2 0 0 1 16 7.1l1.6 3.8" />
      <path d="M4.5 10.9h15a1 1 0 0 1 1 1v2.4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2.4a1 1 0 0 1 1-1Z" />
      <circle cx="8" cy="16.6" r="1.6" />
      <circle cx="16" cy="16.6" r="1.6" />
    </IconSvg>
  ),
  // Shopping bag: straight body with a handle sitting on the rim.
  bag: (p) => (
    <IconSvg {...p}>
      <path d="M4.9 7.9h14.2l-.95 10.3a2 2 0 0 1-2 1.8H7.85a2 2 0 0 1-2-1.8L4.9 7.9Z" />
      <path d="M9.6 7.9V6.4a2.4 2.4 0 0 1 4.8 0v1.5" />
    </IconSvg>
  ),
  // Receipt: torn bottom edge with two well-spaced lines instead of three that merged.
  receipt: (p) => (
    <IconSvg {...p}>
      <path d="M5.5 3.5h13v17l-3.25-1.7-3.25 1.7-3.25-1.7-3.25 1.7V3.5Z" />
      <path d="M9.5 9.5h5M9.5 14.5h5" />
    </IconSvg>
  ),
  home: (p) => (
    <IconSvg {...p}>
      <path d="M4 12.4 12 4.9l8 7.5" />
      <path d="M6.5 10.4V19h11v-8.6" />
    </IconSvg>
  ),
  // Heartbeat: flat leads either side of a single readable spike.
  pulse: (p) => (
    <IconSvg {...p}>
      <path d="M3.5 12.3h3.3l2.2-5.4 2.7 10.2 2-6 1.5 1.2h5.3" />
    </IconSvg>
  ),
  // Open book: tall outer edges pinching toward the spine at both top and bottom,
  // which is the silhouette readers recognise (the old path curled the wrong way).
  book: (p) => (
    <IconSvg {...p}>
      <path d="M12 6.9C10.4 5.4 8.2 4.7 5.6 4.6v14.8c2.6-.1 4.8-.8 6.4-2.3" />
      <path d="M12 6.9c1.6-1.5 3.8-2.2 6.4-2.3v14.8c-2.6-.1-4.8-.8-6.4-2.3" />
    </IconSvg>
  ),
  // Four-point sparkle: one closed shape instead of eight strokes that collapsed.
  spark: (p) => (
    <IconSvg {...p}>
      <path d="M12 4.1c.7 4.2 3.6 7.1 7.9 7.9-4.3.8-7.2 3.7-7.9 7.9-.7-4.2-3.6-7.1-7.9-7.9 4.3-.8 7.2-3.7 7.9-7.9Z" />
    </IconSvg>
  ),
  // Paper plane: three straight edges plus the fold line.
  plane: (p) => (
    <IconSvg {...p}>
      <path d="M20.5 4.2 3.6 11.2l6.2 2.5 2.4 6.1 8.3-15.6Z" />
      <path d="M20.5 4.2 9.8 13.7" />
    </IconSvg>
  ),
  refresh: (p) => (
    <IconSvg {...p}>
      <path d="M20.4 12a8.4 8.4 0 1 1-2.7-6.2" />
      <path d="M20.4 4.6v5.1h-5.1" />
    </IconSvg>
  ),
  user: (p) => (
    <IconSvg {...p}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.4 19.6c1.2-3.3 3.7-5 6.6-5s5.4 1.7 6.6 5" />
    </IconSvg>
  ),
  // Other: an ellipsis drawn with the same stroke as every other glyph instead of
  // filled dots, so it no longer looks like a different icon family.
  dots: (p) => (
    <IconSvg {...p}>
      <path d="M6.2 12h.01M12 12h.01M17.8 12h.01" />
    </IconSvg>
  ),
};

export const categoryIconKeys = Object.keys(
  iconComponents,
) as CategoryIconKey[];

export function CategoryIcon({
  icon,
  className,
  size = 16,
}: {
  icon: string;
  className?: string;
  size?: number;
}) {
  const key = icon as CategoryIconKey;
  const render = iconComponents[key] ?? iconComponents.dots;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className,
      )}
    >
      {render({ size })}
    </span>
  );
}
