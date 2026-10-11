import { createAuthClient } from "better-auth/react";

/**
 * Browser-safe Better Auth client for later sign-up/sign-in/session UI.
 * Talks to /api/auth on the same origin and never sees MONGODB_URI or
 * BETTER_AUTH_SECRET.
 */
export const authClient = createAuthClient();
