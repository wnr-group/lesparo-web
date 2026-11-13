import { describe, expect, it, vi } from "vitest";
import { ABIJA_PRODUCTS_MAX, AbijaCrm, AbijaOutcomeUnknownError, parseBudget, toAbijaPayload } from "@/lib/integrations/crm/abija";
import type { CrmEnquiry } from "@/lib/integrations/crm/types";
import { PermanentIntegrationError, TransientIntegrationError } from "@/lib/integrations/errors";
import { executeJob, type JobRecord } from "@/lib/services/job-runner";

const URL_ = "https://abija.example/api/new_enquiry.php";
const KEY = "test-api-key-1234567890";

const enquiry: CrmEnquiry = {
  websiteEnquiryId: "e4d74c04-06b6-4731-a45d-b91cb5e49e1b",
  enquiryNumber: "LSP-TEST-00001",
  contact: { name: "TEST Buyer (ignore)", email: "test.buyer@example.com", phone: "+91 90000 00000", country: "India" },
  company: { name: "LESPARO TEST Traders" },
  address: "12 Mill Road, Erode, Tamil Nadu",
  message: "TEST enquiry, please ignore.",
  targetBudget: "500000",
  items: [{ productName: "Loom Don Shorts", quantity: 600, specifications: "M, L" }],
  source: "website",
  submittedAt: "2026-11-10T08:00:00Z",
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ok = (id: number | string = 52) => json(200, { success: true, message: "New Enquiry Added Successfully", data: { enquiry_id: id, enquiry_no: "ENQ202600052" } });

function crmWith(fetchImpl: typeof fetch, timeoutMs?: number) {
  return new AbijaCrm({ url: URL_, apiKey: KEY, fetchImpl, timeoutMs });
}
const reply = (res: Response | (() => Promise<Response>)) => vi.fn(async () => (typeof res === "function" ? res() : res)) as unknown as typeof fetch;
const rejectWith = (err: Error) => vi.fn(async () => { throw err; }) as unknown as typeof fetch;
const withCode = (message: string, code: string, name = "TypeError") => Object.assign(new Error(message), { name, cause: { code } });

describe("Abija payload mapping", () => {
  it("maps our enquiry onto the fields the API accepts", () => {
    const p = toAbijaPayload(enquiry);
    expect(p.name).toBe("TEST Buyer (ignore)");
    expect(p.mobile_no).toBe("+91 90000 00000");
    expect(p.company_name).toBe("LESPARO TEST Traders");
    expect(p.address).toBe("12 Mill Road, Erode, Tamil Nadu");
    expect(p.value).toBe(500000);
    expect(p.products).toBe("Website ref: LSP-TEST-00001\n- Loom Don Shorts x 600 (M, L)");
  });

  it("sends only the fields the Abija API accepts", () => {
    const p = toAbijaPayload(enquiry);
    expect(Object.keys(p).sort()).toEqual(["address", "company_name", "mobile_no", "name", "products", "value"]);
  });

  it("keeps the extra form fields (email, country, message) out of the Abija payload; they stay in the admin dashboard", () => {
    const text = JSON.stringify(toAbijaPayload(enquiry));
    expect(text).not.toContain("test.buyer@example.com");
    expect(text).not.toContain("India");
    expect(text).not.toContain("TEST enquiry, please ignore.");
  });

  it("does not use the country as the address", () => {
    expect(toAbijaPayload({ ...enquiry, address: null }).address).toBe("");
  });

  it("sends empty strings for optional text and 0 for a missing value", () => {
    const p = toAbijaPayload({ ...enquiry, company: null, address: null, targetBudget: null });
    expect(p.company_name).toBe("");
    expect(p.address).toBe("");
    expect(p.value).toBe(0);
    expect(typeof p.value).toBe("number");
  });

  it("keeps products within the limit, the reference first, and says when lines were cut", () => {
    const many = Array.from({ length: 20 }, (_, n) => ({ productName: `Product ${n}`, quantity: 100, specifications: "s".repeat(400) }));
    const p = toAbijaPayload({ ...enquiry, items: many });
    expect(p.products.length).toBeLessThanOrEqual(ABIJA_PRODUCTS_MAX);
    expect(p.products.startsWith("Website ref: LSP-TEST-00001\n- Product 0")).toBe(true);
    expect(p.products.endsWith("more lines in the website admin")).toBe(true);
  });

  it("parses budgets written the way buyers write them", () => {
    expect(parseBudget("50000")).toBe(50000);
    expect(parseBudget("₹50,000")).toBe(50000);
    expect(parseBudget("5 lakh")).toBe(500000);
    expect(parseBudget("2.5 lakhs")).toBe(250000);
    expect(parseBudget("1 crore")).toBe(10000000);
    expect(parseBudget("40k")).toBe(40000);
    expect(parseBudget("to be discussed")).toBe(0);
    expect(parseBudget("")).toBe(0);
    expect(parseBudget(null)).toBe(0);
  });
});

describe("Abija adapter: success", () => {
  it("posts JSON with the key in the header and returns the Abija enquiry id", async () => {
    const f = reply(ok(52));
    const out = await crmWith(f).createEnquiry(enquiry, "crm.create_enquiry:abc");
    expect(out).toEqual({ externalId: "52" });

    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL_);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe(KEY);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Idempotency-Key"]).toBe("crm.create_enquiry:abc");
    expect(JSON.parse(init.body as string).name).toBe("TEST Buyer (ignore)");
    // The key must never travel in the URL or the body.
    expect(url).not.toContain(KEY);
    expect(init.body as string).not.toContain(KEY);
  });

  it("accepts a string id too", async () => {
    expect(await crmWith(reply(ok("125"))).createEnquiry(enquiry, "k")).toEqual({ externalId: "125" });
  });

  it("updateEnquiryStatus does nothing, because the API cannot update", async () => {
    await expect(crmWith(reply(ok())).updateEnquiryStatus()).resolves.toBeUndefined();
  });
});

describe("Abija adapter: errors that are safe to retry (nothing was saved)", () => {
  it.each([
    ["500 with a JSON failure body", () => json(500, { success: false, message: "Unable to save enquiry", data: [] })],
    ["502", () => new Response("Bad gateway", { status: 502 })],
    ["503", () => new Response("Unavailable", { status: 503 })],
    ["429", () => new Response("Slow down", { status: 429 })],
  ])("treats %s as transient", async (_name, res) => {
    await expect(crmWith(reply(res())).createEnquiry(enquiry, "k")).rejects.toBeInstanceOf(TransientIntegrationError);
  });

  it.each(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"])("treats %s as transient, since the request never left", async (code) => {
    await expect(crmWith(rejectWith(withCode("fetch failed", code))).createEnquiry(enquiry, "k")).rejects.toBeInstanceOf(TransientIntegrationError);
  });
});

describe("Abija adapter: errors that must not be retried automatically", () => {
  it("blocks on 400 and shows Abija's own message", async () => {
    const err = await crmWith(reply(json(400, { success: false, message: "Name and Mobile Number are required", data: [] }))).createEnquiry(enquiry, "k").catch((e) => e);
    expect(err).toBeInstanceOf(PermanentIntegrationError);
    expect(err).not.toBeInstanceOf(TransientIntegrationError);
    expect(err.message).toMatch(/400.*Name and Mobile Number are required/);
  });

  it("blocks on 401 without echoing any secret", async () => {
    const err = await crmWith(reply(json(401, { success: false, message: `Unauthorized ${KEY}` }))).createEnquiry(enquiry, "k").catch((e) => e);
    expect(err).toBeInstanceOf(PermanentIntegrationError);
    expect(err.message).toMatch(/401/);
    expect(err.message).not.toContain(KEY);
  });

  it("blocks on 405", async () => {
    await expect(crmWith(reply(json(405, { success: false, message: "Only POST method is allowed" }))).createEnquiry(enquiry, "k")).rejects.toBeInstanceOf(PermanentIntegrationError);
  });

  it("does not follow redirects, which would turn the POST into a GET", async () => {
    const f = reply(ok());
    await crmWith(f).createEnquiry(enquiry, "k");
    expect(((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1].redirect).toBe("error");
  });
});

describe("Abija adapter: duplicate prevention when the outcome is unknown", () => {
  const unknown = async (f: typeof fetch) => {
    const err = await crmWith(f, 50).createEnquiry(enquiry, "k").catch((e) => e);
    expect(err).toBeInstanceOf(AbijaOutcomeUnknownError);
    expect(err).not.toBeInstanceOf(TransientIntegrationError);
    // Staff are told exactly what to search for.
    expect(err.message).toContain("LSP-TEST-00001");
    expect(err.message).toMatch(/before pressing Retry now/);
  };

  it("a timeout", async () => unknown(rejectWith(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }))));
  it("a reset connection", async () => unknown(rejectWith(withCode("fetch failed", "ECONNRESET"))));
  it("HTTP 504", async () => unknown(reply(new Response("Gateway timeout", { status: 504 }))));
  it("HTTP 500 with a non-JSON body", async () => unknown(reply(new Response("<b>Fatal error</b>", { status: 500 }))));
  it("HTTP 200 without an enquiry id", async () => unknown(reply(json(200, { success: true, data: {} }))));
  it("HTTP 200 with a body that is not JSON", async () => unknown(reply(new Response("OK", { status: 200 }))));
  it("HTTP 200 that reports success:false", async () => unknown(reply(json(200, { success: false, message: "?" }))));

  it("really times out on a hung request", async () => {
    const hang = vi.fn(async (_u: string, init?: RequestInit) => new Promise<Response>((_res, rej) => init?.signal?.addEventListener("abort", () => rej(init.signal!.reason)))) as unknown as typeof fetch;
    await unknown(hang);
  });
});

describe("Abija adapter inside the job runner", () => {
  const job: JobRecord = { id: "j1", operation: "crm.create_enquiry", idempotency_key: "crm.create_enquiry:x", attempts: 0, max_attempts: 5 };
  const deps = (f: typeof fetch) => ({ crm: crmWith(f), email: null, salesInbox: null, siteUrl: "http://localhost:3000", loadEnquiry: async () => enquiry });

  it("succeeds and returns the id that gets stored as crm_record_id", async () => {
    expect(await executeJob(job, deps(reply(ok(77))))).toEqual({ status: "succeeded", externalId: "77" });
  });

  it("schedules a retry for a documented save failure", async () => {
    const now = new Date("2026-11-10T10:00:00Z");
    const out = await executeJob(job, deps(reply(json(500, { success: false, message: "Unable to save enquiry" }))), now);
    expect(out.status).toBe("failed");
    expect(out.status === "failed" && out.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("blocks, with the website reference in the message, when the outcome is unknown", async () => {
    const out = await executeJob(job, deps(rejectWith(withCode("fetch failed", "ECONNRESET"))));
    expect(out.status).toBe("blocked");
    expect(out.status === "blocked" && out.error).toContain("LSP-TEST-00001");
  });

  it("blocks after the last attempt even for a transient error", async () => {
    const out = await executeJob({ ...job, attempts: 4 }, deps(reply(new Response("x", { status: 503 }))));
    expect(out.status).toBe("blocked");
  });

  it("never leaks the API key into a stored error message", async () => {
    const out = await executeJob(job, deps(reply(json(401, { message: `bad credentials ${KEY}` }))));
    expect(JSON.stringify(out)).not.toContain(KEY);
  });
});
