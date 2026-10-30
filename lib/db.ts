import "server-only";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { connection } from "next/server";

/**
 * Prisma 7 takes a driver adapter instead of a query engine: node-postgres, pointed at Supabase's transaction pooler
 * (DATABASE_URL), configured the same way as the provet-web project: the connection string alone. The database is remote, so idle
 * connections are kept for five minutes (reopening costs a full round trip); max stays small because the pooler multiplexes.
 * Encryption follows the URL as Supabase gives it. To verify the server certificate, set DATABASE_CA_FILE to the CA certificate
 * downloaded from Supabase (Project settings > Database > SSL configuration).
 */
function createPrisma() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_CA_FILE ? { ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") } : undefined, idleTimeoutMillis: 300_000, max: 5 }) });
}

// Reuse one client across hot reloads so dev does not open a new connection per edit.
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = globalForPrisma.__prisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;

/**
 * For request-time reads (admin pages, actions). Opts the caller out of prerendering first
 * (a database query has no business running at build time here); cached catalogue reads use `prisma` directly.
 */
export async function requestDb() {
  await connection();
  return prisma;
}
