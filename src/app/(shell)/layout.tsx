import type { PropsWithChildren } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { SpendlyShellProviders } from "@/app/spendly-shell-providers";
import { getServerSession } from "@/lib/session";

export default async function ShellLayout({ children }: PropsWithChildren) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <SpendlyShellProviders>
      <AppShell>{children}</AppShell>
    </SpendlyShellProviders>
  );
}
