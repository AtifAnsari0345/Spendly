type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="space-y-4">
      <p className="text-xs font-semibold tracking-[0.2em] text-[var(--color-muted-foreground)] uppercase">
        {eyebrow}
      </p>
      <div className="space-y-3">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted-foreground)] sm:text-base">
          {description}
        </p>
      </div>
    </header>
  );
}
