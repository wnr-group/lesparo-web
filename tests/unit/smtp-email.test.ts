/** The SMTP adapter's delivery log: no duplicates, safe failure handling, no secrets or bodies in the log. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const logs: Row[] = [];
let seq = 0;
const emailLog = {
  findUnique: async ({ where }: { where: Row }) => logs.find((r) => r.idempotency_key === where.idempotency_key) ?? null,
  create: async ({ data }: { data: Row }) => {
    if (logs.some((r) => r.idempotency_key === data.idempotency_key)) throw new Error("unique");
    const row = { id: `log-${++seq}`, provider_id: null, updated_at: new Date(), ...data };
    logs.push(row);
    return row;
  },
  updateMany: async ({ where, data }: { where: Row; data: Row }) => {
    const rows = logs.filter((r) => r.id === where.id && r.status === where.status && r.updated_at === where.updated_at);
    rows.forEach((r) => {
      Object.assign(r, data, { attempts: r.attempts + (data.attempts?.increment ?? 0), updated_at: new Date() });
    });
    return { count: rows.length };
  },
  update: async ({ where, data }: { where: Row; data: Row }) => {
    const row = logs.find((r) => r.id === where.id)!;
    Object.assign(row, data, { updated_at: new Date() });
    return row;
  },
};
vi.mock("@/lib/db", () => ({ prisma: { emailLog } }));

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

const SECRET = "super-secret-smtp-password";
let SmtpEmail: typeof import("@/lib/integrations/email/smtp").SmtpEmail;

const msg = { to: "buyer@example.com", subject: "Hello", text: "Body with a secret link token=abc123", html: "<p>x</p>", template: "welcome" };

beforeEach(async () => {
  logs.length = 0;
  sendMail.mockReset();
  Object.assign(process.env, {
    NEXT_PUBLIC_SITE_URL: "https://abija.example",
    RATE_LIMIT_SALT: "test-salt-123456",
    EMAIL_PROVIDER: "smtp",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_USER: "mailer",
    SMTP_PASSWORD: SECRET,
    SMTP_FROM_EMAIL: "no-reply@example.com",
    SMTP_FROM_NAME: "Abija Exports",
  });
  ({ SmtpEmail } = await import("@/lib/integrations/email/smtp"));
});

describe("SmtpEmail", () => {
  it("sends HTML with a plain-text alternative from the configured sender, and logs it as sent", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@mail>" });
    const out = await new SmtpEmail().send(msg, "welcome:1");
    expect(out.externalId).toBe("<abc@mail>");
    const arg = sendMail.mock.calls[0][0];
    expect(arg).toMatchObject({ from: { name: "Abija Exports", address: "no-reply@example.com" }, to: "buyer@example.com", text: msg.text, html: msg.html });
    expect(logs[0]).toMatchObject({ status: "sent", template: "welcome", attempts: 1 });
  });

  it("does not send the same email twice for the same key (retried job)", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@mail>" });
    const mailer = new SmtpEmail();
    await mailer.send(msg, "welcome:1");
    await mailer.send(msg, "welcome:1");
    await mailer.send(msg, "welcome:1");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(logs).toHaveLength(1);
  });

  it("does not send in parallel when another worker has just claimed the key", async () => {
    sendMail.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { messageId: "<abc@mail>" };
    });
    const mailer = new SmtpEmail();
    await Promise.all([mailer.send(msg, "welcome:2"), mailer.send(msg, "welcome:2")]);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("records a failure without secrets or bodies, throws a classified error, and allows a later retry", async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error(`Invalid login password=${SECRET} for buyer@example.com`), { responseCode: 535 }));
    const mailer = new SmtpEmail();
    await expect(mailer.send(msg, "welcome:3")).rejects.toMatchObject({ transient: false });
    expect(logs[0].status).toBe("failed");
    const stored = JSON.stringify(logs[0]);
    expect(stored).not.toContain(SECRET);
    expect(stored).not.toContain("abc123");
    expect(logs[0].last_error).not.toContain("buyer@example.com");

    sendMail.mockResolvedValueOnce({ messageId: "<ok@mail>" });
    await mailer.send(msg, "welcome:3");
    expect(logs[0]).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("treats a 4xx SMTP reply and connection errors as transient", async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error("try later"), { responseCode: 451 }));
    await expect(new SmtpEmail().send(msg, "welcome:4")).rejects.toMatchObject({ transient: true });
    sendMail.mockRejectedValueOnce(Object.assign(new Error("down"), { code: "ECONNECTION" }));
    await expect(new SmtpEmail().send(msg, "welcome:5")).rejects.toMatchObject({ transient: true });
  });
});
