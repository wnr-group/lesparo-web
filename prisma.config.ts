import { defineConfig } from "prisma/config";

// Prisma CLI does not read .env.local itself; package.json scripts pass it via --env-file.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" },
});
