import { describe, expect, it } from "vitest";
import { esc, templates } from "@/lib/email/templates";

const site = "https://abija.example";

describe("email templates", () => {
  it("escapes HTML in every dynamic value", () => {
    const m = templates.welcome({ name: '<img src=x onerror="alert(1)">', siteUrl: site });
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("&lt;img");
    expect(esc(`a&b<c>"d"`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;");
  });

  it("every template has a subject, branded HTML and a plain-text alternative", () => {
    const all = [
      templates.verifyEmail({ name: "Asha", token: "t".repeat(43), siteUrl: site }),
      templates.welcome({ name: "Asha", siteUrl: site }),
      templates.resetPassword({ name: "Asha", token: "t".repeat(43), siteUrl: site }),
      templates.passwordChanged({ name: "Asha", siteUrl: site }),
      templates.confirmNewEmail({ name: "Asha", token: "t".repeat(43), siteUrl: site }),
      templates.enquiryReceived({ name: "Asha", enquiryNumber: "LSP-2026-00001", items: [{ name: "Shorts", detail: "Qty 600" }], siteUrl: site, hasAccount: false }),
      templates.orderPlaced({
        name: "Asha",
        orderNumber: "ORD-2026-00001",
        currency: "INR",
        subtotal: 1200,
        paymentMethod: "Cash on delivery",
        items: [{ name: "Shorts", size: "M", quantity: 2, unitPrice: 600 }],
        shipTo: "1 Main St, Erode, TN 638001",
        siteUrl: site,
        statusUrl: `${site}/account/orders/x`,
      }),
      templates.paymentSuccess({ name: "Asha", orderNumber: "ORD-1", currency: "INR", amount: 1200, siteUrl: site, statusUrl: null }),
      templates.paymentFailed({ name: "Asha", orderNumber: "ORD-1", siteUrl: site, statusUrl: `${site}/checkout/status` }),
      templates.orderStatus({ name: "Asha", orderNumber: "ORD-1", status: "shipped", tracking: { carrier: "DTDC", number: "D123", url: "https://track.example/D123" }, siteUrl: site, orderUrl: null }),
    ];
    for (const m of all) {
      expect(m.subject.length).toBeGreaterThan(3);
      expect(m.html).toContain("LESPARO");
      expect(m.html).toContain('name="viewport"');
      expect(m.text.length).toBeGreaterThan(20);
      expect(m.text).not.toMatch(/<[a-z][\s\S]*>/i);
    }
  });

  it("puts the one-time link in both the HTML and the text, URL-encoded", () => {
    const m = templates.resetPassword({ name: "Asha", token: "ab+/cd", siteUrl: `${site}/` });
    const url = `${site}/account/reset-password?token=ab%2B%2Fcd`;
    expect(m.html).toContain(url);
    expect(m.text).toContain(url);
  });

  it("only renders http(s) links", () => {
    const m = templates.orderStatus({ name: "A", orderNumber: "O", status: "shipped", tracking: { carrier: null, number: null, url: "javascript:alert(1)" }, siteUrl: site, orderUrl: null });
    expect(m.html).not.toContain("javascript:");
  });

  it("shows tracking details only on the shipped email", () => {
    const tracking = { carrier: "DTDC", number: "D123", url: null };
    expect(templates.orderStatus({ name: "A", orderNumber: "O", status: "shipped", tracking, siteUrl: site, orderUrl: null }).text).toContain("D123");
    expect(templates.orderStatus({ name: "A", orderNumber: "O", status: "delivered", tracking, siteUrl: site, orderUrl: null }).text).not.toContain("D123");
  });

  it("does not use em dashes or double hyphens in copy", () => {
    const m = templates.verifyEmail({ name: "Asha", token: "t".repeat(43), siteUrl: site });
    expect(m.text + m.html).not.toMatch(/—|--/);
  });
});
