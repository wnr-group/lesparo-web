import { defineConfig } from "prisma/config";

// Prisma CLI does not read .env.local itself; package.json scripts pass it via --env-file.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations run over the session pooler (DIRECT_URL); the app itself uses the transaction pooler (DATABASE_URL).
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" },
});
