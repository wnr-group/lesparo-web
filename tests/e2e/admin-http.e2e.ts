/**
 * Live HTTP checks against a production build (`next start`), the fake Supabase Auth server and a throwaway Postgres.
 * Forms are posted as multipart bodies with their hidden action fields, exactly as a browser without JavaScript would.
 *
 *   . env (DATABASE_URL -> throwaway db, NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321, SUPABASE_PUBLISHABLE_KEY=x, ...)
 *   npx next build && npx tsx tests/e2e/admin-http.e2e.ts
 */
import { spawn } from "node:child_process";
import { FakeSupabaseAuth } from "../helpers/fake-supabase-auth";
import { db } from "../../scripts/db";

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const PASSWORD = "correct horse battery staple";
const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   <- ${detail}`}`);
};

/** A minimal browser cookie jar. */
let nextClient = 10;
class Jar {
  /** Each simulated browser gets its own address, like separate visitors (the sign-in limit is per address and per email). */
  ip = `198.51.100.${nextClient++}`;
  map = new Map<string, string>();
  attrs = new Map<string, string>();
  absorb(res: Response) {
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...rest] = line.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      const a = rest.join(";").toLowerCase();
      this.attrs.set(name, a);
      if (!value || /max-age=0/.test(a) || /expires=thu, 01 jan 1970/.test(a)) this.map.delete(name);
      else this.map.set(name, value);
    }
  }
  header() {
    return [...this.map].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  get signedIn() {
    return [...this.map.keys()].some((k) => k.startsWith("sb-"));
  }
}

async function req(jar: Jar, path: string, init: RequestInit = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...init, headers: { cookie: jar.header(), origin: BASE, "x-forwarded-for": jar.ip, ...(init.headers ?? {}) } });
  jar.absorb(res);
  return res;
}
const loc = (r: Response) => r.headers.get("location") ?? "";

/** Reads the first <form> that contains the given text and returns its hidden inputs (the server-action fields). */
function hiddenFields(html: string, formHint: string): Record<string, string> {
  const forms = [...html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]);
  const form = forms.find((f) => f.includes(formHint)) ?? "";
  const out: Record<string, string> = {};
  for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = m[0].match(/name="([^"]+)"/)?.[1];
    const value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) out[name] = value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  return out;
}

async function submit(jar: Jar, page: string, formHint: string, fields: Record<string, string>) {
  const html = await (await req(jar, page)).text();
  const hidden = hiddenFields(html, formHint);
  if (!Object.keys(hidden).length) throw new Error(`no action fields found in ${page} (${formHint})`);
  const body = new FormData();
  for (const [k, v] of Object.entries(hidden)) body.set(k, v);
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return req(jar, page, { method: "POST", body });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE + "/robots.txt")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

async function main() {
  const auth = new FakeSupabaseAuth();
  await auth.start(54321);
  const admin = auth.addUser({ email: "admin@abijaexports.com", password: PASSWORD });
  const sales = auth.addUser({ email: "sales@abijaexports.com", password: PASSWORD });
  const customer = auth.addUser({ email: "customer@example.com", password: PASSWORD });
  await db.rateLimit.deleteMany();
  await db.staffUser.deleteMany();
  await db.staffUser.createMany({
    data: [
      { email: admin.email, auth_user_id: admin.id, role: "admin" },
      { email: sales.email, auth_user_id: sales.id, role: "sales" },
    ],
  });

  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d));
  server.stderr.on("data", (d) => (serverLog += d));

  try {
    await waitForServer();
    const anon = new Jar();

    console.log("\n--- public website still works with no customer login");
    for (const p of ["/", "/shop", "/collections", "/collections/test-tees", "/products/test-tee", "/wholesale", "/contact", "/cart", "/checkout", "/about", "/policies/privacy", "/sitemap.xml", "/robots.txt"]) {
      const r = await req(anon, p);
      check(`GET ${p} -> 200 without any session`, r.status === 200, `status ${r.status}`);
    }
    check("public pages set no auth cookie", !anon.signedIn);

    console.log("\n--- Razorpay and API routes are unaffected (no customer auth, own protections)");
    const json = { "content-type": "application/json" };
    let r = await req(anon, "/api/payments/razorpay/order", { method: "POST", headers: json, body: "{}" });
    check("POST razorpay/order with a bad body -> 400", r.status === 400, `status ${r.status}`);
    r = await req(anon, "/api/payments/razorpay/order", { method: "POST", headers: json, body: JSON.stringify({ orderNumber: "ORD-2026-00001", token: "x".repeat(24) }) });
    check("POST razorpay/order well formed but Razorpay not configured -> 503", r.status === 503, `status ${r.status}`);
    r = await req(anon, "/api/payments/razorpay/verify", { method: "POST", headers: json, body: "{}" });
    check("POST razorpay/verify with a bad body -> 400", r.status === 400, `status ${r.status}`);
    r = await req(anon, "/api/payments/razorpay/webhook", { method: "POST", body: "{}" });
    check("POST razorpay/webhook with no secret configured -> 503 (never 200)", r.status === 503, `status ${r.status}`);
    r = await req(anon, "/api/jobs/run");
    check("GET /api/jobs/run without the cron secret -> 401", r.status === 401, `status ${r.status}`);
    r = await req(anon, "/api/jobs/run", { headers: { authorization: "Bearer e2e-cron-secret-0123456789abcdef" } });
    check("GET /api/jobs/run with the cron secret -> 200", r.status === 200, `status ${r.status}`);

    console.log("\n--- unauthorized access to admin pages and endpoints");
    for (const p of ["/admin", "/admin/orders", "/admin/orders/00000000-0000-0000-0000-000000000000", "/admin/products", "/admin/products/new", "/admin/categories", "/admin/enquiries", "/admin/pricing", "/admin/content", "/admin/reset-password", "/admin/attachments/00000000-0000-0000-0000-000000000000"]) {
      r = await req(anon, p);
      check(`GET ${p} signed out -> redirect to /admin/login`, [307, 308, 303].includes(r.status) && loc(r).endsWith("/admin/login"), `status ${r.status} -> ${loc(r)}`);
    }
    r = await req(anon, "/api/admin/notifications");
    check("GET /api/admin/notifications signed out -> 401 JSON", r.status === 401, `status ${r.status}`);
    r = await req(anon, "/admin/products", { method: "POST", headers: { "next-action": "4000000000000000000000000000000000000000ab", "content-type": "text/plain;charset=UTF-8" }, body: "[]" });
    check("direct server-action POST to an admin path signed out is blocked before it runs", [307, 308, 303, 401, 403].includes(r.status), `status ${r.status}`);
    for (const p of ["/admin/login", "/admin/forgot-password"]) {
      r = await req(anon, p);
      check(`GET ${p} is reachable signed out`, r.status === 200, `status ${r.status}`);
    }
    r = await req(anon, "/admin/auth/confirm?token_hash=bogusbogusbogus&type=recovery");
    check("reset link with a bad token -> back to sign-in with an expiry notice", loc(r).includes("/admin/login?notice=expired"), `status ${r.status} -> ${loc(r)}`);
    r = await req(anon, "/admin/auth/confirm?token_hash=bogusbogusbogus&type=signup");
    check("reset link with a non-recovery type is refused", loc(r).includes("notice=expired"), loc(r));

    console.log("\n--- sign in");
    const a = new Jar();
    r = await submit(a, "/admin/login", 'name="password"', { email: admin.email, password: "wrong wrong wrong wrong" });
    let body = await r.text();
    check("wrong password: no session cookie", !a.signedIn);
    check("wrong password: generic error shown", /didn.t match/.test(body) || [200].includes(r.status), `status ${r.status}`);
    r = await submit(a, "/admin/login", 'name="password"', { email: "nobody@example.com", password: PASSWORD });
    check("unknown email: no session cookie", !a.signedIn);
    r = await submit(a, "/admin/login", 'name="password"', { email: customer.email, password: PASSWORD });
    check("valid Supabase user without a staff profile: no session cookie", !a.signedIn);

    r = await submit(a, "/admin/login", 'name="password"', { email: admin.email, password: PASSWORD });
    check("correct admin login -> redirect to /admin", [303, 307].includes(r.status) && loc(r).endsWith("/admin"), `status ${r.status} -> ${loc(r)}`);
    check("session cookie is set", a.signedIn);
    const flags = [...a.attrs.entries()].filter(([k]) => k.startsWith("sb-")).map(([, v]) => v);
    check("session cookie is HttpOnly, SameSite=Lax, Path=/, Secure", flags.length > 0 && flags.every((f) => f.includes("httponly") && f.includes("samesite=lax") && f.includes("path=/") && f.includes("secure")), flags.join(" | "));

    r = await req(a, "/admin");
    body = await r.text();
    check("signed-in admin can open /admin", r.status === 200, `status ${r.status}`);
    check("admin page shows the account and the Administrator role", body.includes(admin.email) && body.includes("Administrator"), "email/role not in page");
    for (const p of ["/admin/orders", "/admin/products", "/admin/products/new", "/admin/enquiries", "/admin/categories", "/admin/pricing", "/admin/content"]) {
      r = await req(a, p);
      check(`signed-in admin: GET ${p} -> 200`, r.status === 200, `status ${r.status}`);
    }
    r = await req(a, "/api/admin/notifications");
    check("signed-in admin: notifications API -> 200", r.status === 200, `status ${r.status}`);

    console.log("\n--- sales role");
    const s = new Jar();
    r = await submit(s, "/admin/login", 'name="password"', { email: sales.email, password: PASSWORD });
    check("sales login works", s.signedIn && [303, 307].includes(r.status), `status ${r.status}`);
    body = await (await req(s, "/admin")).text();
    check("sales user is shown as Sales, not Administrator", body.includes("Sales") && !body.includes(">Administrator<"), "role label wrong");

    console.log("\n--- session expiry and revocation");
    const e1 = new Jar();
    await submit(e1, "/admin/login", 'name="password"', { email: admin.email, password: PASSWORD });
    auth.revokeSessions(admin.id);
    r = await req(e1, "/admin/orders");
    check("revoked session (token no longer valid at Supabase) -> redirect to sign-in", loc(r).endsWith("/admin/login"), `status ${r.status} -> ${loc(r)}`);
    r = await req(e1, "/api/admin/notifications");
    check("revoked session: notifications API -> 401", r.status === 401, `status ${r.status}`);

    const e2 = new Jar();
    await submit(e2, "/admin/login", 'name="password"', { email: admin.email, password: PASSWORD });
    auth.setLastSignIn(admin.id, new Date(Date.now() - 8 * 24 * 3600 * 1000));
    r = await req(e2, "/api/admin/notifications");
    check("sign-in older than 7 days: notifications API -> 401 even though Supabase accepts the token", r.status === 401, `status ${r.status}`);
    body = await (await req(e2, "/admin")).text();
    check("sign-in older than 7 days: admin page content is not served", !body.includes("Administrator") && !body.includes(admin.email), "admin content leaked");

    const e3 = new Jar();
    await submit(e3, "/admin/login", 'name="password"', { email: admin.email, password: PASSWORD });
    await db.staffUser.update({ where: { email: admin.email }, data: { role: "ghost" } });
    r = await req(e3, "/api/admin/notifications");
    check("role changed to an unknown value: access denied immediately", r.status === 401, `status ${r.status}`);
    await db.staffUser.update({ where: { email: admin.email }, data: { role: "admin" } });

    const e4 = new Jar();
    await submit(e4, "/admin/login", 'name="password"', { email: admin.email, password: "x" });
    for (const k of ["sb-127-auth-token", "sb-127-auth-token.0"]) e4.map.set(k, "base64-" + Buffer.from(JSON.stringify({ access_token: "a.b.c", refresh_token: "forged", user: { id: admin.id } })).toString("base64url"));
    r = await req(e4, "/admin");
    check("forged session cookie -> redirect to sign-in", loc(r).endsWith("/admin/login"), `status ${r.status} -> ${loc(r)}`);
    r = await req(e4, "/api/admin/notifications");
    check("forged session cookie: notifications API -> 401", r.status === 401, `status ${r.status}`);

    console.log("\n--- sign out");
    const o = new Jar();
    await submit(o, "/admin/login", 'name="password"', { email: admin.email, password: PASSWORD });
    const copy = new Map(o.map);
    r = await submit(o, "/admin", 'action="', {});
    check("sign out -> redirect to sign-in", loc(r).includes("/admin/login"), `status ${r.status} -> ${loc(r)}`);
    check("sign out clears the session cookie", !o.signedIn);
    const stolen = new Jar();
    copy.forEach((v, k) => stolen.map.set(k, v));
    r = await req(stolen, "/api/admin/notifications");
    check("a copied cookie is dead after sign out (session revoked at Supabase)", r.status === 401, `status ${r.status}`);

    console.log("\n--- password reset");
    const f = new Jar();
    const before = auth.sentRecoveries.length;
    r = await submit(f, "/admin/forgot-password", 'name="email"', { email: admin.email });
    body = await r.text();
    check("reset request for a known email shows the neutral message", /reset link is on its way/.test(body), `status ${r.status}`);
    check("exactly one recovery email was requested", auth.sentRecoveries.length === before + 1);
    r = await submit(f, "/admin/forgot-password", 'name="email"', { email: "ghost@example.com" });
    body = await r.text();
    check("reset request for an unknown email shows the same neutral message", /reset link is on its way/.test(body));
    check("no email was sent for the unknown address", auth.sentRecoveries.length === before + 1);

    const token = auth.sentRecoveries.at(-1)!.tokenHash;
    r = await req(f, `/admin/auth/confirm?token_hash=${token}&type=recovery`);
    check("emailed link -> redirect to /admin/reset-password with a session", loc(r).endsWith("/admin/reset-password") && f.signedIn, `status ${r.status} -> ${loc(r)}`);
    r = await req(new Jar(), `/admin/auth/confirm?token_hash=${token}&type=recovery`);
    check("the same link cannot be used twice", loc(r).includes("notice=expired"), loc(r));
    r = await req(f, "/admin/reset-password");
    body = await r.text();
    check("reset page renders for the recovery session", r.status === 200 && body.includes("Choose a new password"), `status ${r.status}`);
    r = await submit(f, "/admin/reset-password", 'name="confirm"', { password: "short", confirm: "short" });
    body = await r.text();
    check("a short new password is rejected", /at least 8/.test(body), `status ${r.status}`);
    r = await submit(f, "/admin/reset-password", 'name="confirm"', { password: "my brand new password!", confirm: "my brand new password!" });
    check("valid new password -> redirect to sign-in with a notice", loc(r).includes("/admin/login?notice=reset"), `status ${r.status} -> ${loc(r)}`);
    check("all sessions ended after the change", !f.signedIn);
    const g = new Jar();
    await submit(g, "/admin/login", 'name="password"', { email: admin.email, password: PASSWORD });
    check("the old password no longer works", !g.signedIn);
    await submit(g, "/admin/login", 'name="password"', { email: admin.email, password: "my brand new password!" });
    check("the new password works", g.signedIn);

    console.log("\n--- brute force limit on the live server");
    const b = new Jar();
    for (let i = 0; i < 11; i++) await submit(b, "/admin/login", 'name="password"', { email: sales.email, password: `bad password number ${i}` });
    r = await submit(b, "/admin/login", 'name="password"', { email: sales.email, password: PASSWORD });
    body = await r.text();
    check("after repeated failures even the right password is refused for a while", !b.signedIn && /Too many attempts/.test(body), `signedIn=${b.signedIn}`);
  } finally {
    server.kill();
    await auth.stop();
    await db.$disconnect();
  }

  if (process.env.E2E_LOG) (await import("node:fs")).writeFileSync(process.env.E2E_LOG, serverLog);
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nServer log tail:\n" + serverLog.split("\n").slice(-25).join("\n"));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
