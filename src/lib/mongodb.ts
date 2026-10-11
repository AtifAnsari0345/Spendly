import "server-only";

import { MongoClient, type Db } from "mongodb";

type GlobalWithMongoClient = typeof globalThis & {
  spendlyMongoClient?: MongoClient;
};

const globalWithMongo = globalThis as GlobalWithMongoClient;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (server-only — never expose it to the browser).",
    );
  }
  return uri;
}

/**
 * Server-only MongoDB connection.
 *
 * - MONGODB_URI is read lazily, so `next build` and pages that never touch
 *   the database don't require the variable at module load.
 * - The client is cached on globalThis so Next.js dev hot-reload reuses a
 *   single connection pool instead of leaking one per reload.
 * - The driver connects on first operation; the database name comes from the
 *   connection string path.
 * - Never prefix MONGODB_URI with NEXT_PUBLIC_.
 */
export function getMongoDb(): Db {
  if (!globalWithMongo.spendlyMongoClient) {
    globalWithMongo.spendlyMongoClient = new MongoClient(getMongoUri());
  }
  return globalWithMongo.spendlyMongoClient.db();
}
