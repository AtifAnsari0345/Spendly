import type { Metadata } from "next";

import { AuthScreen } from "@/features/auth/ui/auth-screen";
import { ForgotPasswordForm } from "@/features/auth/ui/forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/session";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Get owner-assisted help recovering access to your Spendly account.",
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthScreen>
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
