/**
 * Copies every row of the old local SQLite database into the Postgres database in DATABASE_URL (Supabase).
 *
 *   npm run db:migrate-data -- --dry-run   read SQLite, convert every row, write nothing
 *   npm run db:migrate-data                copy, then verify row counts table by table
 *
 * Safe to run again: rows are inserted with skipDuplicates, keyed by their existing ids, so a second run only adds what is
 * missing. The SQLite file is opened read-only and is never changed. Apply the Postgres migrations first
 * (`npm run db:deploy`), so the tables exist.
 *
 * SQLITE_PATH overrides the source file (default prisma/dev.db).
 */
import Database from "better-sqlite3";
import { Prisma } from "@prisma/client";
import { db } from "./db";

const dryRun = process.argv.includes("--dry-run");
const source = new Database(process.env.SQLITE_PATH ?? "prisma/dev.db", { readonly: true, fileMustExist: true });

type Model = (typeof Prisma.dmmf.datamodel.models)[number];
const models = Prisma.dmmf.datamodel.models;

/** Parents before children, so foreign keys are satisfied on insert. */
function inDependencyOrder(): Model[] {
  const done = new Set<string>();
  const ordered: Model[] = [];
  const visit = (m: Model) => {
    if (done.has(m.name)) return;
    done.add(m.name);
    for (const f of m.fields) if (f.kind === "object" && f.relationFromFields?.length) visit(models.find((x) => x.name === f.type)!);
    ordered.push(m);
  };
  models.forEach(visit);
  return ordered;
}

/** SQLite hands back 0/1, ISO text and JSON text; Postgres wants real booleans, dates and JSON values. */
function convert(type: string, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "Boolean":
      return value === 1 || value === true || value === "1";
    case "DateTime":
      return new Date(value as string | number);
    case "Json":
      return typeof value === "string" ? JSON.parse(value) : value;
    case "Int":
    case "Float":
      return Number(value);
    case "BigInt":
      return BigInt(value as string | number);
    default:
      return value;
  }
}

const delegateOf = (m: Model) => (db as unknown as Record<string, { createMany: (a: unknown) => Promise<{ count: number }>; count: () => Promise<number> }>)[m.name.charAt(0).toLowerCase() + m.name.slice(1)];

async function main() {
  const results: { table: string; sqlite: number; postgres: number | "-" }[] = [];
  for (const m of inDependencyOrder()) {
    const table = m.dbName ?? m.name;
    const scalars = m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
    const rows = source.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
    const data = rows.map((r) => Object.fromEntries(scalars.map((f) => [f.name, convert(f.type, r[f.dbName ?? f.name])])));
    if (!dryRun && data.length) {
      for (let i = 0; i < data.length; i += 500) await delegateOf(m).createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
    }
    // Integer ids with autoincrement are inserted explicitly, so move the Postgres sequence past them.
    if (!dryRun) {
      for (const f of scalars.filter((x) => x.isId && x.hasDefaultValue && typeof x.default === "object" && (x.default as { name?: string }).name === "autoincrement")) {
        await db.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', '${f.name}'), COALESCE((SELECT MAX("${f.name}") FROM "${table}"), 1), (SELECT COUNT(*) > 0 FROM "${table}"))`);
      }
    }
    results.push({ table, sqlite: rows.length, postgres: dryRun ? "-" : await delegateOf(m).count() });
  }
  console.table(results);
  if (dryRun) return console.log("Dry run: nothing was written.");
  const bad = results.filter((r) => r.postgres !== r.sqlite);
  if (bad.length) {
    console.error("Row counts differ for:", bad.map((b) => b.table).join(", "));
    process.exitCode = 1;
  } else console.log("All tables match.");
}

main().finally(() => Promise.all([db.$disconnect(), source.close()]));
