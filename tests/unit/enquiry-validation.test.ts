import { describe, expect, it } from "vitest";
import { formDataToEnquiryInput, parseEnquiryForm } from "@/lib/services/enquiry-form";

const PRODUCT = "8e0ecdc8-b83e-4e33-bc6a-c3739c573935";

function form(overrides: Record<string, string | null> = {}) {
  const base: Record<string, string> = {
    idempotencyKey: "0b8e9c5e-3a52-4f63-9a35-2d6c8f9a1b11",
    customerName: "Test Buyer",
    email: "buyer@example.com",
    phone: "+91 90000 00000",
    message: "Need 600 pieces delivered to Coimbatore.",
    consent: "on",
    "items.0.productId": PRODUCT,
    "items.0.quantity": "600",
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) if (v !== null) fd.set(k, v);
  return fd;
}

describe("wholesale enquiry validation", () => {
  it("accepts a complete enquiry", () => {
    const r = parseEnquiryForm(form());
    expect(r.success).toBe(true);
    expect(r.data?.items[0]).toMatchObject({ productId: PRODUCT, quantity: 600 });
  });

  it("treats a blank quantity as not given (regression: '' coerced to 0)", () => {
    const r = parseEnquiryForm(form({ "items.1.productId": PRODUCT, "items.1.quantity": "" }));
    expect(r.success).toBe(true);
    expect(r.data?.items[1].quantity).toBeUndefined();
  });

  it("accepts quantities typed with thousands separators", () => {
    expect(parseEnquiryForm(form({ "items.0.quantity": "1,20,000" })).data?.items[0].quantity).toBe(120000);
  });

  it("rejects zero, negative and fractional quantities", () => {
    for (const q of ["0", "-5", "2.5"]) expect(parseEnquiryForm(form({ "items.0.quantity": q })).success).toBe(false);
  });

  it("requires a product or a described custom requirement on each line", () => {
    const r = parseEnquiryForm(form({ "items.0.productId": "", "items.0.specifications": "cotton" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path.join(".") === "items.0.productName")).toBe(true);
    expect(parseEnquiryForm(form({ "items.0.productId": "", "items.0.productName": "White towels 30x60" })).success).toBe(true);
  });

  it("drops untouched blank lines but requires at least one line", () => {
    const fd = form({ "items.0.productId": "", "items.0.quantity": "" });
    expect(formDataToEnquiryInput(fd).items).toHaveLength(0);
    expect(parseEnquiryForm(fd).success).toBe(false);
  });

  it("requires consent, a valid email and a plausible phone", () => {
    expect(parseEnquiryForm(form({ consent: null })).success).toBe(false);
    expect(parseEnquiryForm(form({ email: "not-an-email" })).success).toBe(false);
    expect(parseEnquiryForm(form({ phone: "call me" })).success).toBe(false);
  });

  it("flags the honeypot field", () => {
    const r = parseEnquiryForm(form({ website: "http://spam.example" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "website")).toBe(true);
  });

  it("rejects a malformed idempotency key", () => {
    expect(parseEnquiryForm(form({ idempotencyKey: "abc" })).success).toBe(false);
  });
});
