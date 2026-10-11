import type { Metadata } from "next";

import { AuthScreen } from "@/features/auth/ui/auth-screen";
import { LoginForm } from "@/features/auth/ui/login-form";
import { redirectIfAuthenticated } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your private Spendly account.",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <AuthScreen>
      <LoginForm />
    </AuthScreen>
  );
}
