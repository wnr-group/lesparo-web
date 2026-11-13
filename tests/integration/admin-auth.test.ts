/**
 * Admin authentication against a real Postgres (TEST_DATABASE_URL, migrations applied) and a local fake of the Supabase
 * Auth API (tests/helpers/fake-supabase-auth.ts). The app's real code runs: the Supabase client, the server actions, the
 * route handlers, Prisma and the guards. Only next/headers (cookies), next/navigation and next/cache are replaced.
 *
 *   docker run -d --name lesparo-authtest -e POSTGRES_PASSWORD=test -e POSTGRES_DB=lesparo -p 55432:5432 postgres:16-alpine
 *   DATABASE_URL=postgresql://postgres:test@localhost:55432/lesparo DIRECT_URL=$DATABASE_URL npx prisma migrate deploy
 *   TEST_DATABASE_URL=postgresql://postgres:test@localhost:55432/lesparo npx vitest run tests/integration
 */
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeSupabaseAuth } from "../helpers/fake-supabase-auth";

const run = promisify(execFile);
const TEST_DB = process.env.TEST_DATABASE_URL;

const h = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  options: new Map<string, Record<string, unknown> | undefined>(),
  headers: new Headers(),
}));

vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...h.jar].map(([name, value]) => ({ name, value })),
    get: (name: string) => (h.jar.has(name) ? { name, value: h.jar.get(name)! } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      h.options.set(name, options);
      if (options?.maxAge === 0 || value === "") h.jar.delete(name);
      else h.jar.set(name, value);
    },
    delete: (name: string) => void h.jar.delete(name),
  }),
  headers: async () => h.headers,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/cache", () => ({ refresh: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, cacheTag: () => {}, cacheLife: () => {} }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));

const auth = new FakeSupabaseAuth();
let prisma: typeof import("@/lib/db")["prisma"];
let login: typeof import("@/app/admin/login/actions");
let forgot: typeof import("@/app/admin/forgot-password/actions");
let reset: typeof import("@/app/admin/reset-password/actions");
let staff: typeof import("@/lib/auth/staff");

const PASSWORD = "correct horse battery staple";
const fd = (o: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const redirectOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    const m = String((e as Error).message).match(/^NEXT_REDIRECT:(.*)$/);
    if (m) return m[1];
    throw e;
  }
  return null;
};
const signedIn = () => [...h.jar.keys()].some((k) => k.startsWith("sb-"));

let admin: ReturnType<typeof auth.addUser>;
let sales: ReturnType<typeof auth.addUser>;
let customer: ReturnType<typeof auth.addUser>;
let sneaky: ReturnType<typeof auth.addUser>;
let unconfirmed: ReturnType<typeof auth.addUser>;

describe.skipIf(!TEST_DB)("admin authentication (Supabase Auth, real database)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.NEXT_PUBLIC_SUPABASE_URL = await auth.start();
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.RATE_LIMIT_SALT = "test-salt-for-rate-limits";
    ({ prisma } = await import("@/lib/db"));
    login = await import("@/app/admin/login/actions");
    forgot = await import("@/app/admin/forgot-password/actions");
    reset = await import("@/app/admin/reset-password/actions");
    staff = await import("@/lib/auth/staff");

    admin = auth.addUser({ email: "admin@abijaexports.com", password: PASSWORD });
    sales = auth.addUser({ email: "sales@abijaexports.com", password: PASSWORD });
    customer = auth.addUser({ email: "customer@example.com", password: PASSWORD });
    sneaky = auth.addUser({ email: "sneaky@example.com", password: PASSWORD, user_metadata: { role: "admin", is_admin: true }, app_metadata: { role: "admin", roles: ["admin"] } });
    unconfirmed = auth.addUser({ email: "new@abijaexports.com", password: PASSWORD, confirmed: false });

    await prisma.staffUser.deleteMany();
    await prisma.staffUser.createMany({
      data: [
        { email: admin.email, auth_user_id: admin.id, role: "admin" },
        { email: sales.email, auth_user_id: sales.id, role: "sales" },
        { email: unconfirmed.email, auth_user_id: unconfirmed.id, role: "admin" },
      ],
    });
  });

  afterAll(async () => {
    await auth.stop();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    h.jar.clear();
    h.options.clear();
    h.headers = new Headers({ "x-forwarded-for": "203.0.113.7" });
    await prisma.rateLimit.deleteMany();
  });

  const signInAs = (email: string, password = PASSWORD) => redirectOf(login.signIn({}, fd({ email, password })));

  describe("sign in", () => {
    it("signs an admin in, sets an httpOnly session cookie and resolves the role from the database", async () => {
      expect(await signInAs(admin.email)).toBe("/admin");
      expect(signedIn()).toBe(true);
      const opts = [...h.options.values()].find((o) => o && o.maxAge !== 0);
      expect(opts).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
      expect(await staff.getStaffSession()).toMatchObject({ email: admin.email, isAdmin: true, roles: ["admin"] });
    });

    it("signs a sales user in without admin rights", async () => {
      expect(await signInAs(sales.email)).toBe("/admin");
      expect(await staff.getStaffSession()).toMatchObject({ isAdmin: false, roles: ["sales"] });
      await expect(staff.requireStaff()).resolves.toBeTruthy();
      await expect(staff.requireAdmin()).rejects.toThrow(/Administrator access is required/);
    });

    it("rejects a wrong password with a generic message and no session", async () => {
      const state = await login.signIn({}, fd({ email: admin.email, password: "wrong password here" }));
      expect(state.error).toMatch(/didn’t match/);
      expect(signedIn()).toBe(false);
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("gives the identical answer for an unknown email, so accounts cannot be discovered", async () => {
      const unknown = await login.signIn({}, fd({ email: "nobody@example.com", password: PASSWORD }));
      const wrong = await login.signIn({}, fd({ email: admin.email, password: "nope nope nope nope" }));
      expect(unknown.error).toBe(wrong.error);
    });

    it("rejects a valid Supabase account that has no staff profile and ends its session at once", async () => {
      const state = await login.signIn({}, fd({ email: customer.email, password: PASSWORD }));
      expect(state.error).toMatch(/didn’t match/);
      expect(signedIn()).toBe(false);
      expect(auth.requests).toContain("POST /logout");
    });

    it("rejects an account whose email is not confirmed", async () => {
      const state = await login.signIn({}, fd({ email: unconfirmed.email, password: PASSWORD }));
      expect(state.error).toBeTruthy();
      expect(signedIn()).toBe(false);
    });

    it("rejects malformed input before contacting Supabase", async () => {
      const before = auth.requests.length;
      expect((await login.signIn({}, fd({ email: "not-an-email", password: "x" }))).error).toMatch(/Enter your email and password/);
      expect((await login.signIn({}, fd({ email: admin.email }))).error).toBeTruthy();
      expect((await login.signIn({}, fd({ email: "a@b.co", password: "x".repeat(500) }))).error).toBeTruthy();
      expect(auth.requests.length).toBe(before);
    });

    it("slows repeated guessing: the 11th attempt in ten minutes is refused even with the right password", async () => {
      for (let i = 0; i < 10; i++) await login.signIn({}, fd({ email: admin.email, password: `bad password ${i} ${i}` }));
      const blocked = await login.signIn({}, fd({ email: admin.email, password: PASSWORD }));
      expect(blocked.error).toMatch(/Too many attempts/);
      expect(signedIn()).toBe(false);
    });
  });

  describe("privilege escalation", () => {
    it("a Supabase user who claims role=admin in their own metadata gets no access without a staff row", async () => {
      const state = await login.signIn({}, fd({ email: sneaky.email, password: PASSWORD }));
      expect(state.error).toBeTruthy();
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("even holding a valid Supabase session, the metadata role is ignored", async () => {
      // Sign the sneaky user in at Supabase directly (as if sign-ups were open), then ask the app who they are.
      const res = await fetch(`${auth.url}/auth/v1/token?grant_type=password`, { method: "POST", body: JSON.stringify({ email: sneaky.email, password: PASSWORD }) });
      expect(res.status).toBe(200);
      const session = (await res.json()) as Record<string, unknown>;
      const { createServerClient } = await import("@supabase/ssr");
      const client = createServerClient(auth.url, "k", { cookies: { getAll: () => [...h.jar].map(([name, value]) => ({ name, value })), setAll: (c) => c.forEach(({ name, value }) => h.jar.set(name, value)) } });
      await client.auth.setSession({ access_token: session.access_token as string, refresh_token: session.refresh_token as string });
      expect(signedIn()).toBe(true);
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("an unknown role value in staff_users grants nothing", async () => {
      await prisma.staffUser.update({ where: { email: sales.email }, data: { role: "superuser" } });
      try {
        await signInAs(sales.email);
        expect(await staff.getStaffSession()).toBeNull();
      } finally {
        await prisma.staffUser.update({ where: { email: sales.email }, data: { role: "sales" } });
      }
    });

    it("a staff row with no Supabase link cannot be reached by email alone", async () => {
      await prisma.staffUser.create({ data: { email: customer.email, role: "admin" } });
      try {
        const state = await login.signIn({}, fd({ email: customer.email, password: PASSWORD }));
        expect(state.error).toBeTruthy();
        expect(await staff.getStaffSession()).toBeNull();
      } finally {
        await prisma.staffUser.delete({ where: { email: customer.email } });
      }
    });
  });

  describe("sessions", () => {
    it("refreshes an expired access token and keeps the admin signed in", async () => {
      auth.tokenTtlSeconds = 30; // the client sees an access token that is already expiring
      try {
        await signInAs(admin.email);
      } finally {
        auth.tokenTtlSeconds = 3600;
      }
      const before = auth.requests.filter((r) => r === "POST /token").length;
      const cookieBefore = JSON.stringify([...h.jar]);
      expect(await staff.getStaffSession()).toMatchObject({ email: admin.email });
      expect(auth.requests.filter((r) => r === "POST /token").length).toBe(before + 1); // refresh_token grant
      expect(JSON.stringify([...h.jar])).not.toBe(cookieBefore); // new tokens written back to the cookie
    });

    it("denies once the session is revoked at Supabase (refresh token no longer valid)", async () => {
      auth.tokenTtlSeconds = 30;
      try {
        await signInAs(admin.email);
      } finally {
        auth.tokenTtlSeconds = 3600;
      }
      auth.revokeSessions(admin.id);
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("denies a live-looking cookie whose token Supabase has revoked", async () => {
      await signInAs(admin.email);
      auth.revokeSessions(admin.id);
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("denies a sign-in older than the 7 day limit even though Supabase still accepts the token", async () => {
      await signInAs(admin.email);
      auth.setLastSignIn(admin.id, new Date(Date.now() - 8 * 24 * 3600 * 1000));
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("denies a forged or tampered session cookie", async () => {
      await signInAs(admin.email);
      for (const k of [...h.jar.keys()]) h.jar.set(k, "base64-" + Buffer.from(JSON.stringify({ access_token: "x.y.z", refresh_token: "forged", user: { id: admin.id } })).toString("base64url"));
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("denies a removed staff member immediately, even with a live Supabase session", async () => {
      await signInAs(sales.email);
      const row = await prisma.staffUser.findUniqueOrThrow({ where: { email: sales.email } });
      await prisma.staffUser.delete({ where: { email: sales.email } });
      try {
        expect(await staff.getStaffSession()).toBeNull();
      } finally {
        await prisma.staffUser.create({ data: { email: row.email, auth_user_id: row.auth_user_id, role: row.role } });
      }
    });
  });

  describe("sign out", () => {
    it("clears the cookies, revokes the session at Supabase and redirects to sign-in", async () => {
      await signInAs(admin.email);
      const token = JSON.stringify([...h.jar.values()]);
      expect(token.length).toBeGreaterThan(10);
      expect(await redirectOf(login.signOut())).toBe("/admin/login?notice=signedout");
      expect(signedIn()).toBe(false);
      expect(await staff.getStaffSession()).toBeNull();
    });

    it("a copied session cookie stops working after sign out", async () => {
      await signInAs(admin.email);
      const copy = new Map(h.jar);
      await redirectOf(login.signOut());
      h.jar.clear();
      copy.forEach((v, k) => h.jar.set(k, v));
      expect(await staff.getStaffSession()).toBeNull();
    });
  });

  describe("password reset", () => {
    it("answers the same for known and unknown emails and only sends mail to the known one", async () => {
      const before = auth.sentRecoveries.length;
      const known = await forgot.requestPasswordReset({}, fd({ email: admin.email }));
      const unknown = await forgot.requestPasswordReset({}, fd({ email: "ghost@example.com" }));
      expect(known.sent).toBe(true);
      expect(unknown.sent).toBe(true);
      expect(auth.sentRecoveries.length).toBe(before + 1);
    });

    it("rejects a malformed email and rate limits reset requests", async () => {
      expect((await forgot.requestPasswordReset({}, fd({ email: "nope" }))).error).toBeTruthy();
      for (let i = 0; i < 5; i++) await forgot.requestPasswordReset({}, fd({ email: admin.email }));
      expect((await forgot.requestPasswordReset({}, fd({ email: admin.email }))).error).toMatch(/Too many requests/);
    });

    it("the emailed link signs the admin in briefly, once, and lets them set a new password", async () => {
      const { GET } = await import("@/app/admin/auth/confirm/route");
      const { NextRequest } = await import("next/server");
      await forgot.requestPasswordReset({}, fd({ email: admin.email }));
      const { tokenHash } = auth.sentRecoveries.at(-1)!;
      const open = (q: string) => GET(new NextRequest(`http://localhost:3000/admin/auth/confirm?${q}`));

      const first = await open(`token_hash=${tokenHash}&type=recovery`);
      expect(first.headers.get("location")).toBe("http://localhost:3000/admin/reset-password");
      expect(signedIn()).toBe(true);

      // Single use.
      h.jar.clear();
      const second = await open(`token_hash=${tokenHash}&type=recovery`);
      expect(second.headers.get("location")).toContain("/admin/login?notice=expired");
      expect(signedIn()).toBe(false);

      // New link, then change the password.
      await forgot.requestPasswordReset({}, fd({ email: admin.email }));
      await open(`token_hash=${auth.sentRecoveries.at(-1)!.tokenHash}&type=recovery`);
      expect((await reset.resetPassword({}, fd({ password: "short", confirm: "short" }))).error).toMatch(/at least 12/);
      expect((await reset.resetPassword({}, fd({ password: "a brand new long password", confirm: "different long password" }))).error).toMatch(/do not match/);
      expect(await redirectOf(reset.resetPassword({}, fd({ password: "a brand new long password", confirm: "a brand new long password" })))).toBe("/admin/login?notice=reset");

      // Signed out everywhere; the old password is dead and the new one works.
      expect(signedIn()).toBe(false);
      expect((await login.signIn({}, fd({ email: admin.email, password: PASSWORD }))).error).toBeTruthy();
      expect(await signInAs(admin.email, "a brand new long password")).toBe("/admin");
      admin.password = "a brand new long password";
    });

    it("only the recovery token type is accepted, tokens of other types or junk are refused, and no open redirect exists", async () => {
      const { GET } = await import("@/app/admin/auth/confirm/route");
      const { NextRequest } = await import("next/server");
      await forgot.requestPasswordReset({}, fd({ email: sales.email }));
      const { tokenHash } = auth.sentRecoveries.at(-1)!;
      for (const q of [`token_hash=${tokenHash}&type=magiclink`, `token_hash=${tokenHash}&type=signup`, `token_hash=${tokenHash}&type=email`, "token_hash=short&type=recovery", "type=recovery", "token_hash=%00%00%00%00%00%00%00%00%00%00%00&type=recovery"]) {
        const res = await GET(new NextRequest(`http://localhost:3000/admin/auth/confirm?${q}`));
        expect(res.headers.get("location")).toContain("/admin/login?notice=expired");
      }
      const ok = await GET(new NextRequest(`http://localhost:3000/admin/auth/confirm?token_hash=${tokenHash}&type=recovery&next=https://evil.example/&redirect_to=https://evil.example/`));
      expect(new URL(ok.headers.get("location")!).origin).toBe("http://localhost:3000");
    });

    it("a recovery link for an account without a staff profile gives no session", async () => {
      const { GET } = await import("@/app/admin/auth/confirm/route");
      const { NextRequest } = await import("next/server");
      await forgot.requestPasswordReset({}, fd({ email: customer.email }));
      const res = await GET(new NextRequest(`http://localhost:3000/admin/auth/confirm?token_hash=${auth.sentRecoveries.at(-1)!.tokenHash}&type=recovery`));
      expect(res.headers.get("location")).toContain("/admin/login?notice=expired");
      expect(signedIn()).toBe(false);
    });

    it("setting a new password needs a signed-in staff session", async () => {
      expect((await reset.resetPassword({}, fd({ password: "a perfectly fine password", confirm: "a perfectly fine password" }))).error).toMatch(/expired/);
    });
  });

  describe("direct access to admin endpoints without signing in", () => {
    it("the notifications API returns 401 and the attachment download returns 401", async () => {
      const notifications = await import("@/app/api/admin/notifications/route");
      const attachment = await import("@/app/admin/attachments/[id]/route");
      expect((await notifications.GET()).status).toBe(401);
      expect((await attachment.GET(new Request("http://x/admin/attachments/x"), { params: Promise.resolve({ id: randomUUID() }) } as never)).status).toBe(401);
    });

    it("a signed-in staff member can read both", async () => {
      const notifications = await import("@/app/api/admin/notifications/route");
      await signInAs(sales.email);
      expect((await notifications.GET()).status).toBe(200);
    });
  });

  describe("every admin server action re-checks the user on the server", () => {
    const U = randomUUID();
    const prev = {};
    type Call = [module: string, name: string, args: () => unknown[], adminOnly: boolean];
    const calls: Call[] = [
      ["categories", "deleteCategory", () => [U, false], true],
      ["categories", "saveCategory", () => [null, prev, fd({ name: "Hacked" })], true],
      ["categories", "saveCategory", () => [U, prev, fd({ name: "Hacked" })], true],
      ["content", "saveHomepage", () => [prev, fd()], true],
      ["enquiries", "markEnquirySeen", () => [U], false],
      ["enquiries", "markAllEnquiriesSeen", () => [], false],
      ["enquiries", "updateEnquiry", () => [U, prev, fd({ status: "accepted" })], false],
      ["enquiries", "addNote", () => [U, prev, fd({ note: "hello" })], false],
      ["enquiries", "retryIntegrationJob", () => [U], false],
      ["orders", "updateOrder", () => [U, prev, fd({ status: "shipped", paymentStatus: "paid" })], false],
      ["orders", "reconcileOrderAction", () => [U], false],
      ["pricing", "savePrices", () => [prev, fd()], true],
      ["products", "saveProduct", () => [null, prev, fd({ name: "Hacked" })], true],
      ["products", "setArchived", () => [U, true], true],
      ["products", "deleteProduct", () => [U, false], true],
      ["products", "uploadImages", () => [U, prev, fd()], true],
      ["products", "updateImage", () => [U, { remove: true }], true],
    ];
    const path = (m: string) => `@/app/admin/(panel)/${m}/actions`;
    const TABLES = ["products", "categories", "site_content", "wholesale_enquiries", "enquiry_notes", "enquiry_status_history", "integration_jobs", "retail_orders", "order_audits", "product_images", "staff_users"];
    const snapshot = async () => {
      const out: Record<string, unknown> = {};
      for (const t of TABLES) out[t] = await prisma.$queryRawUnsafe(`select * from ${t} order by 1`);
      return JSON.stringify(out);
    };

    beforeAll(async () => {
      // A clean slate: this suite owns the (throwaway) test database.
      await prisma.retailOrder.deleteMany();
      await prisma.wholesaleEnquiry.deleteMany();
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      await prisma.siteContent.deleteMany();
      const cat = await prisma.category.create({ data: { name: "Seed", slug: "seed-cat" } });
      const prod = await prisma.product.create({ data: { name: "Seed", slug: "seed-prod", category_id: cat.id } });
      await prisma.retailOrder.create({ data: { order_number: "ORD-T-1", idempotency_key: randomUUID(), customer_name: "T", email: "t@x.com", phone: "1", address_line: "a", city: "c", state: "s", postcode: "1", subtotal: 100, items: { create: [{ product_id: prod.id, product_name: "Seed", quantity: 1, unit_price: 100 }] } } });
      await prisma.wholesaleEnquiry.create({ data: { enquiry_number: "LSP-T-1", idempotency_key: randomUUID(), customer_name: "T", email: "t@x.com", phone: "1", message: "m", consent_at: new Date() } });
    });

    it("lists every exported action (a new action must be added to this table)", async () => {
      for (const m of ["categories", "content", "enquiries", "orders", "pricing", "products"]) {
        const mod = (await import(path(m))) as Record<string, unknown>;
        const exported = Object.keys(mod).filter((k) => typeof mod[k] === "function");
        const covered = new Set(calls.filter((c) => c[0] === m).map((c) => c[1]));
        expect(exported.filter((k) => !covered.has(k)), `module ${m}`).toEqual([]);
      }
    });

    it.each(calls.map((c) => [`${c[0]}.${c[1]}`, c] as const))("signed out: %s is refused and writes nothing", async (_n, [m, name, args]) => {
      const mod = (await import(path(m))) as Record<string, (...a: unknown[]) => Promise<unknown>>;
      const before = await snapshot();
      const result = (await mod[name](...args()).catch((e) => ({ threw: String(e) }))) as { error?: string; threw?: string } | undefined;
      // Actions answer with the permission error (never a validation or "not found" error: the guard must run first).
      // The void bell actions swallow it and simply do nothing, which the unchanged snapshot below proves.
      if (!["markEnquirySeen", "markAllEnquiriesSeen"].includes(name)) expect(result?.error ?? result?.threw, "should be refused by the guard").toMatch(/do not have permission/);
      expect(await snapshot()).toBe(before);
    });

    it.each(calls.filter((c) => c[3]).map((c) => [`${c[0]}.${c[1]}`, c] as const))("signed in as sales: admin-only %s is refused and writes nothing", async (_n, [m, name, args]) => {
      await signInAs(sales.email);
      const mod = (await import(path(m))) as Record<string, (...a: unknown[]) => Promise<unknown>>;
      const before = await snapshot();
      const result = (await mod[name](...args()).catch((e) => ({ threw: String(e) }))) as { error?: string; threw?: string } | undefined;
      expect(result?.error ?? result?.threw, "should be refused").toMatch(/Administrator access is required/);
      expect(await snapshot()).toBe(before);
    });

    it("signed in as sales: a staff-level action still works (the guard does not over-block)", async () => {
      await signInAs(sales.email);
      const { markAllEnquiriesSeen } = await import(path("enquiries"));
      await markAllEnquiriesSeen();
      expect((await prisma.wholesaleEnquiry.findFirstOrThrow()).admin_seen_at).not.toBeNull();
    });

    it("a refund on a Razorpay order needs an administrator, not just sales", async () => {
      const { updateOrder } = await import(path("orders"));
      const order = await prisma.retailOrder.findFirstOrThrow();
      await prisma.retailOrder.update({ where: { id: order.id }, data: { payment_method: "razorpay", payment_status: "paid" } });
      await signInAs(sales.email);
      const refused = await updateOrder(order.id, {}, fd({ status: order.status, paymentStatus: "refunded" }));
      expect(refused.error).toMatch(/Administrator access is required/);
      expect((await prisma.retailOrder.findUniqueOrThrow({ where: { id: order.id } })).payment_status).toBe("paid");
    });
  });

  describe("provisioning script (scripts/grant-staff-role.ts)", { timeout: 120_000 }, () => {
    const grant = (...args: string[]) =>
      run("npx", ["tsx", "scripts/grant-staff-role.ts", ...args], {
        shell: true,
        env: { ...process.env, DATABASE_URL: TEST_DB, NEXT_PUBLIC_SUPABASE_URL: auth.url, SUPABASE_SECRET_KEY: "sb_secret_test" },
        timeout: 120_000,
      }).then(
        (r) => ({ ok: true as const, out: r.stdout + r.stderr }),
        (e: { stdout?: string; stderr?: string }) => ({ ok: false as const, out: (e.stdout ?? "") + (e.stderr ?? "") }),
      );

    it("creates a confirmed Supabase user plus a linked staff row, printing a random password once", async () => {
      const r = await grant("newadmin@abijaexports.com", "admin");
      expect(r.ok, r.out).toBe(true);
      expect(r.out).toMatch(/Temporary password/);
      const row = await prisma.staffUser.findUniqueOrThrow({ where: { email: "newadmin@abijaexports.com" } });
      const created = [...auth.users.values()].find((u) => u.email === "newadmin@abijaexports.com")!;
      expect(row).toMatchObject({ role: "admin", auth_user_id: created.id, password_hash: null });
      expect(created.email_confirmed_at).not.toBeNull();
      expect(created.password.length).toBeGreaterThanOrEqual(12);
    });

    it("changes a role without duplicating anything, and refuses bad input", async () => {
      expect((await grant("newadmin@abijaexports.com", "sales")).ok).toBe(true);
      expect((await prisma.staffUser.findUniqueOrThrow({ where: { email: "newadmin@abijaexports.com" } })).role).toBe("sales");
      expect([...auth.users.values()].filter((u) => u.email === "newadmin@abijaexports.com")).toHaveLength(1);
      expect((await grant("x@y.com", "root")).ok).toBe(false);
      expect((await grant("not-an-email", "admin")).ok).toBe(false);
      expect((await grant("short@y.com", "admin", "--password", "short")).ok).toBe(false);
    });

    it("revoking deletes both the login and the staff row", async () => {
      const r = await grant("newadmin@abijaexports.com", "--revoke");
      expect(r.ok, r.out).toBe(true);
      expect(await prisma.staffUser.findUnique({ where: { email: "newadmin@abijaexports.com" } })).toBeNull();
      expect([...auth.users.values()].some((u) => u.email === "newadmin@abijaexports.com")).toBe(false);
    });
  });
});
