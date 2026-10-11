import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";

/**
 * Server-side session helpers for protected pages and server logic.
 *
 * Always derive the acting user from the authenticated session here —
 * never trust a userId supplied by the client for authorization.
 */
export async function getServerSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

/**
 * Returns the authenticated user or throws. Future expense/category writes
 * must take their userId from here (server session), never from the request
 * body.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: an authenticated session is required.");
  }
  return user;
}

/**
 * Auth pages (/login, /sign-up, /forgot-password) should only render for
 * signed-out visitors. Authenticated users are sent to the main app.
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }
}
