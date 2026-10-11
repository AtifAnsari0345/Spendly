import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

// Recommended Better Auth mount point. The instance is resolved per request so
// env vars and the database connection are only needed when auth is called,
// never during `next build`.
const handler = (request: Request) => getAuth().handler(request);

export const { GET, POST } = toNextJsHandler(handler);
