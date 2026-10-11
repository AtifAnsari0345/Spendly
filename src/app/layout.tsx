import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { PropsWithChildren } from "react";

import { env } from "@/config/env";
import { siteConfig } from "@/config/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: env.NEXT_PUBLIC_APP_NAME,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: {
    icon: [{ url: "/spendly-logo.png", type: "image/png", sizes: "576x384" }],
  },
};

// Preferences (theme/currency/locale) now live in MongoDB and are applied
// after the authenticated user's initial data load. This boot script only
// paints the default "system" appearance first — it deliberately does NOT
// read localStorage, so a stale theme cached by another user on a shared
// browser can never flash before this account's preferences arrive.
const themeBootScript = `(function(){try{var r=document.documentElement;r.setAttribute('data-theme','system');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      data-theme="system"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
