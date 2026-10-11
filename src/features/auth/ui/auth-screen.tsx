import Image from "next/image";
import type { PropsWithChildren } from "react";

import { siteConfig } from "@/config/site";
import { GithubIcon, LinkedinIcon } from "@/features/auth/ui/brand-icons";

/**
 * Cinematic auth chrome shared by /login and /sign-up.
 *
 * Dark-first ambient background (mint glows + an "S"-echoing ribbon) built
 * from pure CSS/SVG animation — no animation libraries. Theme-aware through
 * the existing design tokens, reduced-motion safe, mobile-first with safe-area
 * padding.
 */
const authStyles = `
.auth-glow { position: absolute; border-radius: 9999px; }
.auth-glow-a {
  top: -20%; left: -14%;
  width: min(78vw, 660px); aspect-ratio: 1 / 1;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.20) 0%, rgba(16, 185, 129, 0) 68%);
  animation: auth-drift-a 28s ease-in-out infinite alternate;
}
.auth-glow-b {
  right: -18%; bottom: -26%;
  width: min(84vw, 720px); aspect-ratio: 1 / 1;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.15) 0%, rgba(45, 212, 191, 0) 66%);
  animation: auth-drift-b 34s ease-in-out infinite alternate;
}
.auth-ribbon {
  position: absolute; inset: 0; width: 100%; height: 100%;
  animation: auth-sway 30s ease-in-out infinite alternate;
}
.auth-enter { animation: auth-fade-up 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
.auth-flow { stroke-dasharray: 8 348; animation: auth-flow 12s linear infinite; }
@keyframes auth-fade-up {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes auth-drift-a {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(6%, 9%, 0) scale(1.08); }
}
@keyframes auth-drift-b {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(-7%, -6%, 0) scale(1.06); }
}
@keyframes auth-sway {
  from { transform: translate3d(-1.5%, 1.5%, 0) rotate(-1deg); }
  to { transform: translate3d(1.5%, -1.5%, 0) rotate(1deg); }
}
@keyframes auth-flow { to { stroke-dashoffset: -696; } }
@media (prefers-reduced-motion: reduce) {
  .auth-enter, .auth-glow-a, .auth-glow-b, .auth-ribbon, .auth-flow { animation: none; }
}
`;

const RIBBON_PATH =
  "M1090 110 C830 40 700 300 610 395 C520 490 400 700 95 640";

/** Quiet developer links rendered at the foot of every auth screen. */
const CONNECT_LINKS = [
  { href: siteConfig.links.github, label: "GitHub", Icon: GithubIcon },
  { href: siteConfig.links.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
] as const;

export function AuthScreen({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
      <style>{authStyles}</style>

      {/* Ambient background: mint glows + S-ribbon echo (decorative only) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="auth-glow auth-glow-a" />
        <div className="auth-glow auth-glow-b" />
        <svg
          className="auth-ribbon"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient
              id="auth-ribbon-grad"
              x1="0"
              y1="0"
              x2="1200"
              y2="800"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#34d399" stopOpacity="0" />
              <stop offset="0.45" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={RIBBON_PATH}
            stroke="url(#auth-ribbon-grad)"
            strokeWidth="88"
            strokeLinecap="round"
          />
          <path
            d={RIBBON_PATH}
            stroke="url(#auth-ribbon-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            className="auth-flow"
            d={RIBBON_PATH}
            stroke="#6ee7b7"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 pb-[calc(env(safe-area-inset-bottom)_+_1.5rem)] sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-10 lg:pb-10 lg:pt-10">
        {/* Brand column: compact logo on mobile, cinematic lockup on desktop */}
        <header className="auth-enter pt-[calc(env(safe-area-inset-top)_+_1rem)] lg:pt-0">
          <Image
            src="/spendly-logo.png"
            alt="Spendly"
            width={576}
            height={384}
            priority
            className="h-12 w-auto object-contain sm:h-14 lg:hidden"
          />
          <div className="hidden lg:block">
            <Image
              src="/spendly-logo.png"
              alt="Spendly"
              width={576}
              height={384}
              priority
              className="h-24 w-auto object-contain xl:h-28"
            />
            <p className="mt-7 max-w-md text-2xl font-semibold tracking-tight xl:text-3xl">
              Your money, beautifully organized.
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-muted-foreground)]">
              A calm, private spending space for everyone in your household,
              where each account only ever sees its own data.
            </p>
            <div
              className="mt-7 h-px w-44"
              style={{
                background:
                  "linear-gradient(90deg, rgba(52, 211, 153, 0.75), transparent)",
              }}
            />
          </div>
        </header>

        {/* Authentication panel */}
        <main
          className="auth-enter mt-8 w-full lg:mt-0"
          style={{ animationDelay: "90ms" }}
        >
          <section className="mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/75 p-6 shadow-soft backdrop-blur-xl sm:p-8 lg:mx-0 lg:max-w-lg">
            <div
              aria-hidden="true"
              className="mb-6 h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.45), transparent)",
              }}
            />
            {children}
          </section>

          {/* Connect rail: subtle developer links, aligned with the auth panel */}
          <div
            className="auth-enter mx-auto mt-5 flex w-full max-w-md items-center justify-center gap-2.5 lg:mx-0 lg:max-w-lg lg:justify-start"
            style={{ animationDelay: "180ms" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Connect
            </span>
            <span
              aria-hidden="true"
              className="hidden h-px w-6 lg:block"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-border), transparent)",
              }}
            />
            {CONNECT_LINKS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={`${label} profile (opens in a new tab)`}
                className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 transition-colors duration-200 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
              >
                {/* Colour lives on this span, not the anchor: the global
                    `a { color: inherit }` reset outranks utility classes. */}
                <span className="text-[var(--color-muted-foreground)] transition-colors duration-200 group-hover:text-[var(--color-foreground)]">
                  <Icon size={15} />
                </span>
              </a>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
