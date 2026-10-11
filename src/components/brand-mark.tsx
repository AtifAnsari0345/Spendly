import Image from "next/image";

import { cn } from "@/lib/cn";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/*
       * Tightly-cropped mark (252×260 source) instead of the padded banner.
       * The banner asset is ~53% empty width and ~27% empty height, so at the
       * same box height the artwork only drew ~34px tall. Skipping the padding
       * makes the logo ~38% larger at the identical header/sidebar height —
       * the full mark is preserved, just without the transparent margin.
       */}
      <Image
        src="/spendly-logo-mark.png"
        alt="Spendly"
        width={252}
        height={260}
        className="h-12 w-auto shrink-0 object-contain lg:h-14"
      />
      <div className={compact ? "hidden sm:block" : undefined}>
        <p className="text-sm font-semibold tracking-[0.22em] text-[var(--color-muted-foreground)] uppercase">
          Expense System
        </p>
        <p className="text-lg font-semibold tracking-tight text-[var(--color-foreground)] sm:text-xl">
          Spendly
        </p>
      </div>
    </div>
  );
}
