import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_MAX_AGE_MS, isSignInTooOld, isStaffRole, resolveStaffSession, type StaffProfile, type VerifiedAuthUser } from "@/lib/auth/staff-core";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const user = (over: Partial<VerifiedAuthUser> = {}): VerifiedAuthUser => ({ id: "auth-1", email: "a@x.com", email_confirmed_at: "2026-11-01T00:00:00Z", last_sign_in_at: "2026-11-11T08:00:00Z", ...over });
const profile = (over: Partial<StaffProfile> = {}): StaffProfile => ({ id: "staff-1", email: "a@x.com", role: "admin", ...over });

describe("resolveStaffSession", () => {
  it("accepts a verified, confirmed, recent admin with a profile", () => {
    expect(resolveStaffSession(user(), profile(), NOW)).toEqual({ userId: "staff-1", authUserId: "auth-1", email: "a@x.com", roles: ["admin"], isAdmin: true });
  });
  it("gives sales no admin rights", () => {
    const s = resolveStaffSession(user(), profile({ role: "sales" }), NOW);
    expect(s?.isAdmin).toBe(false);
    expect(s?.roles).toEqual(["sales"]);
  });
  it("denies a signed-out visitor", () => {
    expect(resolveStaffSession(null, profile(), NOW)).toBeNull();
  });
  it("denies a Supabase user with no staff profile (a customer, or a self-registered account)", () => {
    expect(resolveStaffSession(user(), null, NOW)).toBeNull();
  });
  it("ignores role claims in user_metadata and app_metadata: only the staff_users row counts", () => {
    const escalated = { ...user(), user_metadata: { role: "admin", isAdmin: true }, app_metadata: { role: "admin", roles: ["admin"] } };
    expect(resolveStaffSession(escalated, null, NOW)).toBeNull();
    // ...and with a sales profile the metadata cannot upgrade it.
    expect(resolveStaffSession(escalated, profile({ role: "sales" }), NOW)?.isAdmin).toBe(false);
  });
  it.each(["superadmin", "ADMIN", "", "owner", "customer"])("denies an unknown role %j", (role) => {
    expect(resolveStaffSession(user(), profile({ role }), NOW)).toBeNull();
  });
  it("denies an unconfirmed email", () => {
    expect(resolveStaffSession(user({ email_confirmed_at: null }), profile(), NOW)).toBeNull();
  });
  it("denies a sign-in older than the absolute limit, however it was refreshed", () => {
    const old = new Date(NOW - ADMIN_SESSION_MAX_AGE_MS - 1000).toISOString();
    expect(resolveStaffSession(user({ last_sign_in_at: old }), profile(), NOW)).toBeNull();
  });
  it("denies when the sign-in time is missing or unreadable (fails closed)", () => {
    expect(resolveStaffSession(user({ last_sign_in_at: null }), profile(), NOW)).toBeNull();
    expect(resolveStaffSession(user({ last_sign_in_at: "not a date" }), profile(), NOW)).toBeNull();
  });
});

describe("session limits", () => {
  it("allows a sign-in just inside the limit and rejects one just past it", () => {
    expect(isSignInTooOld(new Date(NOW - ADMIN_SESSION_MAX_AGE_MS + 1000).toISOString(), NOW)).toBe(false);
    expect(isSignInTooOld(new Date(NOW - ADMIN_SESSION_MAX_AGE_MS - 1000).toISOString(), NOW)).toBe(true);
  });
  it("knows the two staff roles only", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("sales")).toBe(true);
    expect(isStaffRole("root")).toBe(false);
  });
});

describe("database security migration", () => {
  const root = process.cwd();
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  const tables = [...schema.matchAll(/@@map\("([a-z_]+)"\)/g)].map((m) => m[1]);
  const sql = readdirSync(join(root, "prisma/migrations"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readFileSync(join(root, "prisma/migrations", d.name, "migration.sql"), "utf8"))
    .join("\n");

  it("finds the application tables", () => {
    expect(tables.length).toBeGreaterThanOrEqual(18);
    expect(tables).toContain("staff_users");
  });
  it.each(tables)("enables row level security on %s (add new tables to a migration)", (table) => {
    expect(sql).toMatch(new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
  });
  it("never grants anything to the public Data API roles", () => {
    expect(sql).not.toMatch(/GRANT\s+[^;]*\bTO\s+(anon|authenticated|public)\b/i);
    expect(sql).not.toMatch(/CREATE POLICY[^;]*FOR\s+(SELECT|INSERT|UPDATE|DELETE)[^;]*USING\s*\(\s*true\s*\)/i);
  });
  it("keeps roles out of Supabase user metadata in the schema comments", () => {
    expect(schema).toMatch(/Roles live here/);
  });
});
