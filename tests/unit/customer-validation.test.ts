import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/safe-next";
import { addressSchema, loginSchema, passwordField, registerSchema } from "@/lib/validation/customer";

describe("customer validation", () => {
  const ok = { name: "Asha Raman", email: " Asha@Example.COM ", phone: "+91 90000 00000", password: "correct horse 9" };

  it("normalises the email to lowercase and trims it", () => {
    expect(registerSchema.parse(ok).email).toBe("asha@example.com");
  });

  it("enforces password strength and the bcrypt length limit", () => {
    expect(passwordField.safeParse("short1").success).toBe(false);
    expect(passwordField.safeParse("onlyletterspassword").success).toBe(false);
    expect(passwordField.safeParse("1234567890123").success).toBe(false);
    expect(passwordField.safeParse("a1" + "x".repeat(80)).success).toBe(false);
    expect(passwordField.safeParse("longenough1").success).toBe(true);
  });

  it("rejects bad names, emails and phone numbers with readable messages", () => {
    const r = registerSchema.safeParse({ ...ok, name: "A", email: "nope", phone: "abc" });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toContain("Enter your name.");
    expect(messages).toContain("Enter a valid email address.");
  });

  it("treats a filled honeypot as invalid", () => {
    expect(registerSchema.safeParse({ ...ok, website: "http://spam" }).success).toBe(false);
  });

  it("login does not apply password-strength rules, so older passwords still work", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });

  it("validates addresses and ignores any customer id sent along", () => {
    const parsed = addressSchema.parse({ label: "Home", fullName: "Asha", phone: "9000000000", line: "12 Mill Road", city: "Erode", state: "Tamil Nadu", postcode: "638001", isDefault: "on", customerId: "someone-else" });
    expect(parsed.isDefault).toBe(true);
    expect("customerId" in parsed).toBe(false);
  });

  it("only follows same-site, non-admin paths after sign-in", () => {
    expect(safeNext("/account/orders")).toBe("/account/orders");
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("/admin/orders")).toBe("/account");
    expect(safeNext(undefined)).toBe("/account");
  });
});
