import { PageIntro } from "@/components/page-intro";
import { Card } from "@/components/ui/card";
import { AccountCard } from "@/features/settings/ui/account-card";
import { CurrencySetting } from "@/features/settings/ui/currency-setting";
import { ThemeSetting } from "@/features/settings/ui/theme-setting";
import { CategoryManager } from "@/features/settings/ui/category-manager";
import { DataReset } from "@/features/settings/ui/data-reset";
import { getServerSession } from "@/lib/session";

function SectionHeading({
  eyebrow,
  description,
}: {
  eyebrow: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
        {eyebrow}
      </p>
      <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getServerSession();
  const user = session?.user ?? null;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Settings"
        title="Make Spendly feel like yours."
        description="Choose how the app looks, which currency your totals use, and how your categories are organized. Every change saves automatically."
      />

      <Card className="space-y-5">
        <SectionHeading
          eyebrow="Account"
          description="Signed in on this device. Logging out ends this session but keeps all of your data."
        />
        <AccountCard user={user ? { name: user.name, email: user.email } : null} />
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-5">
          <SectionHeading
            eyebrow="Appearance"
            description="Follow your device or pick a mode explicitly. The choice is remembered between visits."
          />
          <ThemeSetting />
        </Card>

        <Card className="space-y-5">
          <SectionHeading
            eyebrow="Currency"
            description="The selected currency formats every amount across the dashboard, expenses, analytics, and reports."
          />
          <CurrencySetting />
        </Card>
      </section>

      <Card className="space-y-5">
        <SectionHeading
          eyebrow="Categories"
          description="Keep your category list tidy. Add custom categories, rename any category, and remove the ones you no longer need."
        />
        <CategoryManager />
      </Card>

      <Card className="space-y-5">
        <SectionHeading
          eyebrow="Data"
          description="Start over with a clean slate when you need to. Destructive actions always ask for confirmation first."
        />
        <DataReset />
      </Card>
    </div>
  );
}
