import type { Metadata } from "next";

import { AuthScreen } from "@/features/auth/ui/auth-screen";
import { SignUpForm } from "@/features/auth/ui/sign-up-form";
import { redirectIfAuthenticated } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a private Spendly account for your spending.",
};

export default async function SignUpPage() {
  await redirectIfAuthenticated();

  return (
    <AuthScreen>
      <SignUpForm />
    </AuthScreen>
  );
}
