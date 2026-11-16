/**
 * Customer account flows (register, verify, sign in, reset, change password/email, record linking) against an in-memory stand-in
 * for the database and a recording stand-in for the mailer. No network, no SMTP.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const tables: Record<string, Row[]> = {};
let idSeq = 0;

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === null) return row[k] == null;
    if (v && typeof v === "object" && "gt" in v) return row[k] > v.gt;
    if (v && typeof v === "object" && "equals" in v) return String(row[k] ?? "").toLowerCase() === String(v.equals).toLowerCase();
    if (v && typeof v === "object" && "not" in v) return row[k] !== v.not;
    return row[k] === v;
  });
}
function apply(row: Row, data: Row) {
  for (const [k, v] of Object.entries(data)) row[k] = v && typeof v === "object" && "increment" in v ? (row[k] ?? 0) + v.increment : v;
  row.updated_at = new Date();
}
function model(name: string, uniques: string[] = [], defaults: () => Row = () => ({})) {
  const t = (tables[name] ??= []);
  const find = (where: Row) => t.find((r) => matches(r, where));
  return {
    findUnique: async ({ where }: { where: Row }) => find(where) ?? null,
    findFirst: async ({ where }: { where: Row }) => find(where) ?? null,
    create: async ({ data }: { data: Row }) => {
      for (const u of uniques) if (t.some((r) => r[u] === data[u])) throw new Error(`unique ${u}`);
      const row = { id: `id-${++idSeq}`, created_at: new Date(), updated_at: new Date(), ...defaults(), ...data };
      t.push(row);
      return row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = find(where);
      if (!row) throw new Error("not found");
      if (data.email && t.some((r) => r !== row && r.email === data.email)) throw new Error("unique email");
      apply(row, data);
      return row;
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = t.filter((r) => matches(r, where));
      rows.forEach((r) => apply(r, data));
      return { count: rows.length };
    },
  };
}

const prismaFake = {
  customer: model("customer", ["email"], () => ({ session_version: 0, email_verified_at: null })),
  customerToken: model("customerToken", ["token_hash"], () => ({ used_at: null, new_email: null })),
  retailOrder: model("retailOrder", [], () => ({ customer_id: null })),
  wholesaleEnquiry: model("wholesaleEnquiry", [], () => ({ customer_id: null })),
};
vi.mock("@/lib/db", () => ({ prisma: prismaFake }));

const sent: { to: string; template: string; text: string; key: string }[] = [];
vi.mock("@/lib/email/send", () => ({
  siteUrl: () => "https://abija.example",
  sendEmail: async (o: { to: string; template: string; rendered: { text: string }; key: string }) => {
    sent.push({ to: o.to, template: o.template, text: o.rendered.text, key: o.key });
    return { status: "sent" };
  },
}));

let allowed = true;
vi.mock("@/lib/services/enquiries", () => ({ hitRateLimit: async () => allowed, rateLimitKey: (k: string) => k }));

type Auth = typeof import("@/lib/services/customer-auth");
let auth: Auth;

const tokenFrom = (template: string) => {
  const mail = [...sent].reverse().find((m) => m.template === template);
  return decodeURIComponent(mail!.text.match(/token=([^\s]+)/)![1]);
};
const reg = { name: "Asha Raman", email: "asha@example.com", phone: "9000000000", password: "correct horse 9" };

beforeEach(async () => {
  for (const k of Object.keys(tables)) tables[k].length = 0;
  sent.length = 0;
  allowed = true;
  auth = await import("@/lib/services/customer-auth");
});

describe("registration and email verification", () => {
  it("creates an unverified account, hashes the password and emails a verification link", async () => {
    const r = await auth.registerCustomer(reg, "1.1.1.1");
    expect(r).toEqual({ ok: true, emailSent: true });
    const c = tables.customer[0];
    expect(c.password_hash).not.toContain("correct horse");
    expect(c.password_hash).toMatch(/^\$2[aby]\$12\$/);
    expect(c.email_verified_at).toBeNull();
    expect(sent.map((m) => m.template)).toEqual(["verify_email"]);
    // Only a hash of the token is stored.
    expect(JSON.stringify(tables.customerToken)).not.toContain(tokenFrom("verify_email"));
  });

  it("cannot sign in until the email is verified, then can", async () => {
    await auth.registerCustomer(reg, "1.1.1.1");
    const before = await auth.authenticateCustomer({ email: reg.email, password: reg.password }, "1.1.1.1");
    expect(before).toMatchObject({ ok: false, code: "unverified" });

    const confirmed = await auth.confirmEmailToken(tokenFrom("verify_email"), "verify_email");
    expect(confirmed).toEqual({ ok: true, changed: false });
    expect(sent.map((m) => m.template)).toContain("welcome");

    const after = await auth.authenticateCustomer({ email: reg.email, password: reg.password }, "1.1.1.1");
    expect(after).toMatchObject({ ok: true });
  });

  it("a verification link works once only", async () => {
    await auth.registerCustomer(reg, "1.1.1.1");
    const token = tokenFrom("verify_email");
    expect((await auth.confirmEmailToken(token, "verify_email")).ok).toBe(true);
    expect((await auth.confirmEmailToken(token, "verify_email")).ok).toBe(false);
    // The welcome email is sent once.
    expect(sent.filter((m) => m.template === "welcome")).toHaveLength(1);
  });

  it("two simultaneous uses of one token: exactly one wins", async () => {
    await auth.registerCustomer(reg, "1.1.1.1");
    const token = tokenFrom("verify_email");
    const results = await Promise.all([auth.confirmEmailToken(token, "verify_email"), auth.confirmEmailToken(token, "verify_email")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("an expired token is refused", async () => {
    await auth.registerCustomer(reg, "1.1.1.1");
    tables.customerToken[0].expires_at = new Date(Date.now() - 1000);
    expect((await auth.confirmEmailToken(tokenFrom("verify_email"), "verify_email")).ok).toBe(false);
  });

  it("a token of one kind cannot be used for another", async () => {
    await auth.registerCustomer(reg, "1.1.1.1");
    expect(await auth.consumeToken(tokenFrom("verify_email"), "reset_password")).toBeNull();
  });

  it("refuses to register an address that already has a verified account", async () => {
    await auth.registerCustomer(reg, "1.1.1.1");
    await auth.confirmEmailToken(tokenFrom("verify_email"), "verify_email");
    const again = await auth.registerCustomer({ ...reg, password: "another pass 77" }, "1.1.1.1");
    expect(again).toMatchObject({ ok: false });
    expect(tables.customer).toHaveLength(1);
  });

  it("registering again before verifying replaces the unverified details instead of duplicating the account", async () => {
    await auth.registerCustomer(reg, "1.1.1.1");
    await auth.registerCustomer({ ...reg, name: "Asha R", password: "second pass 12" }, "1.1.1.1");
    expect(tables.customer).toHaveLength(1);
    expect(tables.customer[0].name).toBe("Asha R");
    // Only the newest link works.
    expect(tables.customerToken.filter((t) => !t.used_at)).toHaveLength(1);
  });

  it("links earlier guest orders and enquiries with the same email once verified", async () => {
    tables.retailOrder.push({ id: "o1", email: "ASHA@example.com", customer_id: null });
    tables.retailOrder.push({ id: "o2", email: "other@example.com", customer_id: null });
    tables.wholesaleEnquiry.push({ id: "e1", email: "asha@example.com", customer_id: null });
    await auth.registerCustomer(reg, "1.1.1.1");
    expect(tables.retailOrder[0].customer_id).toBeNull();
    await auth.confirmEmailToken(tokenFrom("verify_email"), "verify_email");
    expect(tables.retailOrder[0].customer_id).toBe(tables.customer[0].id);
    expect(tables.retailOrder[1].customer_id).toBeNull();
    expect(tables.wholesaleEnquiry[0].customer_id).toBe(tables.customer[0].id);
  });
});

describe("sign in", () => {
  async function verifiedAccount() {
    await auth.registerCustomer(reg, "1.1.1.1");
    await auth.confirmEmailToken(tokenFrom("verify_email"), "verify_email");
  }

  it("gives the same message for an unknown email and a wrong password", async () => {
    await verifiedAccount();
    const wrong = await auth.authenticateCustomer({ email: reg.email, password: "not the password 1" }, "1.1.1.1");
    const unknown = await auth.authenticateCustomer({ email: "nobody@example.com", password: "not the password 1" }, "1.1.1.1");
    expect(wrong).toMatchObject({ ok: false });
    expect(unknown).toEqual(wrong);
  });

  it("is rate limited", async () => {
    await verifiedAccount();
    allowed = false;
    const r = await auth.authenticateCustomer({ email: reg.email, password: reg.password }, "1.1.1.1");
    expect(r).toMatchObject({ ok: false, code: "rate_limited" });
    expect(await auth.registerCustomer({ ...reg, email: "new@example.com" }, "1.1.1.1")).toMatchObject({ ok: false });
    expect(await auth.requestPasswordReset(reg.email, "1.1.1.1")).toMatchObject({ ok: false });
  });
});

describe("forgot and reset password", () => {
  async function verifiedAccount() {
    await auth.registerCustomer(reg, "1.1.1.1");
    await auth.confirmEmailToken(tokenFrom("verify_email"), "verify_email");
    sent.length = 0;
  }

  it("does not reveal whether an address has an account", async () => {
    await verifiedAccount();
    expect(await auth.requestPasswordReset("nobody@example.com", "1.1.1.1")).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
    expect(await auth.requestPasswordReset(reg.email, "1.1.1.1")).toEqual({ ok: true });
    expect(sent.map((m) => m.template)).toEqual(["reset_password"]);
  });

  it("resets the password once, signs other sessions out, and the old password stops working", async () => {
    await verifiedAccount();
    const versionBefore = tables.customer[0].session_version;
    await auth.requestPasswordReset(reg.email, "1.1.1.1");
    const token = tokenFrom("reset_password");

    expect((await auth.resetPassword(token, "brand new pass 5", "1.1.1.1")).ok).toBe(true);
    expect(tables.customer[0].session_version).toBe(versionBefore + 1);
    expect(sent.map((m) => m.template)).toContain("password_changed");
    expect((await auth.resetPassword(token, "yet another 99", "1.1.1.1")).ok).toBe(false);

    expect((await auth.authenticateCustomer({ email: reg.email, password: reg.password }, "1.1.1.1")).ok).toBe(false);
    expect((await auth.authenticateCustomer({ email: reg.email, password: "brand new pass 5" }, "1.1.1.1")).ok).toBe(true);
  });

  it("a newer reset request cancels the older link", async () => {
    await verifiedAccount();
    await auth.requestPasswordReset(reg.email, "1.1.1.1");
    const first = tokenFrom("reset_password");
    await auth.requestPasswordReset(reg.email, "1.1.1.1");
    expect((await auth.resetPassword(first, "brand new pass 5", "1.1.1.1")).ok).toBe(false);
    expect((await auth.resetPassword(tokenFrom("reset_password"), "brand new pass 5", "1.1.1.1")).ok).toBe(true);
  });
});

describe("signed-in account changes", () => {
  async function verifiedAccount() {
    await auth.registerCustomer(reg, "1.1.1.1");
    await auth.confirmEmailToken(tokenFrom("verify_email"), "verify_email");
    sent.length = 0;
    return tables.customer[0].id as string;
  }

  it("changing the password needs the current one and bumps the session version", async () => {
    const id = await verifiedAccount();
    expect(await auth.changePassword(id, "wrong password 1", "brand new pass 5")).toMatchObject({ ok: false });
    const r = await auth.changePassword(id, reg.password, "brand new pass 5");
    expect(r).toMatchObject({ ok: true, version: 1 });
    expect(sent.map((m) => m.template)).toEqual(["password_changed"]);
  });

  it("changing the email waits for confirmation from the new address, and keeps the old one meanwhile", async () => {
    const id = await verifiedAccount();
    expect(await auth.requestEmailChange(id, "new@example.com", "wrong password 1")).toMatchObject({ ok: false });
    expect(await auth.requestEmailChange(id, "new@example.com", reg.password)).toMatchObject({ ok: true });
    expect(sent[0]).toMatchObject({ template: "confirm_new_email", to: "new@example.com" });
    expect(tables.customer[0].email).toBe(reg.email);

    expect((await auth.confirmEmailToken(tokenFrom("confirm_new_email"), "change_email")).ok).toBe(true);
    expect(tables.customer[0].email).toBe("new@example.com");
  });

  it("refuses to switch to an address another account uses", async () => {
    const id = await verifiedAccount();
    tables.customer.push({ id: "other", email: "taken@example.com" });
    expect(await auth.requestEmailChange(id, "taken@example.com", reg.password)).toMatchObject({ ok: false });
  });
});
