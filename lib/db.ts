import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { connection } from "next/server";

/**
 * Prisma 7 takes a driver adapter instead of a query engine. SQLite (a local file) via
 * better-sqlite3; moving to Postgres later means swapping this adapter and DATABASE_URL.
 */
function createPrisma() {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) });
}

// Reuse one client across hot reloads so dev does not open a new connection per edit.
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = globalForPrisma.__prisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;

/**
 * For request-time reads (admin pages, actions). SQLite queries finish during prerendering,
 * so this opts the caller out of it first; cached catalogue reads use `prisma` directly.
 */
export async function requestDb() {
  await connection();
  return prisma;
}
