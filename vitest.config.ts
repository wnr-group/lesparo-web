import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  // tests/integration needs a real Postgres (TEST_DATABASE_URL) and skips itself without one; see docs/admin-auth.md.
  // The database-backed suites share one throwaway database, so test files run one after another.
  test: { include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"], environment: "node", fileParallelism: false },
});
