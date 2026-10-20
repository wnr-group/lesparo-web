import { describe, expect, it } from "vitest";
import { MockCrm } from "@/lib/integrations/crm/mock";
import type { CrmEnquiry } from "@/lib/integrations/crm/types";
import { MockEmail } from "@/lib/integrations/email/mock";
import { nextAttemptDelayMs, safeErrorMessage } from "@/lib/integrations/errors";
import { blockedReason, executeJob, type JobRecord } from "@/lib/services/job-runner";

const enquiry: CrmEnquiry = {
  websiteEnquiryId: "e4d74c04-06b6-4731-a45d-b91cb5e49e1b",
  enquiryNumber: "LSP-2026-00001",
  contact: { name: "Test Buyer", email: "buyer@example.com", phone: "+91 90000 00000", country: "India" },
  company: { name: "QA Test Traders" },
  message: "Need 600 pieces",
  items: [{ productName: "Loom Don Shorts", quantity: 600, specifications: "M, L" }],
  source: "website",
  submittedAt: "2026-10-19T08:00:00Z",
};

const job = (operation: JobRecord["operation"], attempts = 0): JobRecord => ({ id: "j1", operation, idempotency_key: `${operation}:x`, attempts, max_attempts: 5 });
const deps = (over: Partial<Parameters<typeof executeJob>[1]> = {}) => ({
  crm: new MockCrm(),
  email: new MockEmail(),
  salesInbox: "sales@example.com",
  siteUrl: "http://localhost:3000",
  loadEnquiry: async () => enquiry,
  ...over,
});

describe("integration job runner", () => {
  it("blocks — never fakes success — when a provider is not configured", async () => {
    const out = await executeJob(job("crm.create_enquiry"), deps({ crm: null }));
    expect(out.status).toBe("blocked");
    expect(out.status === "blocked" && out.error).toMatch(/not configured/);
    expect(blockedReason("email.sales_notification", { crm: null, email: new MockEmail(), salesInbox: null })).toMatch(/SALES_NOTIFICATION_EMAIL/);
  });

  it("creates a CRM record and is idempotent per job key", async () => {
    const crm = new MockCrm();
    const a = await executeJob(job("crm.create_enquiry"), deps({ crm }));
    const b = await executeJob(job("crm.create_enquiry"), deps({ crm }));
    expect(a).toMatchObject({ status: "succeeded" });
    expect(b).toEqual(a);
    expect(crm.records.size).toBe(1);
  });

  it("schedules a retry with backoff on transient failure", async () => {
    const crm = new MockCrm();
    crm.failNext = "transient";
    const now = new Date("2026-10-19T08:00:00Z");
    const out = await executeJob(job("crm.create_enquiry"), deps({ crm }), now);
    expect(out.status).toBe("failed");
    if (out.status === "failed") expect(out.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("stops retrying on permanent failure or when attempts are exhausted", async () => {
    const crm = new MockCrm();
    crm.failNext = "permanent";
    expect((await executeJob(job("crm.create_enquiry"), deps({ crm }))).status).toBe("blocked");
    crm.failNext = "transient";
    expect((await executeJob(job("crm.create_enquiry", 4), deps({ crm }))).status).toBe("blocked");
  });

  it("sends the sales notification with the buyer as reply-to", async () => {
    const email = new MockEmail();
    await executeJob(job("email.sales_notification"), deps({ email }));
    const msg = [...email.sent.values()][0];
    expect(msg.to).toBe("sales@example.com");
    expect(msg.replyTo).toBe("buyer@example.com");
    expect(msg.subject).toContain("LSP-2026-00001");
  });

  it("backs off exponentially within bounds", () => {
    const fixed = () => 0.5;
    expect(nextAttemptDelayMs(1, fixed)).toBe(60_000);
    expect(nextAttemptDelayMs(3, fixed)).toBe(240_000);
    expect(nextAttemptDelayMs(30, fixed)).toBe(3_600_000);
  });

  it("redacts secrets and emails from logged errors", () => {
    const s = safeErrorMessage(new Error("401 token=abc123 for buyer@example.com api_key: zzz"));
    expect(s).not.toContain("abc123");
    expect(s).not.toContain("buyer@example.com");
    expect(s).not.toContain("zzz");
  });
});
