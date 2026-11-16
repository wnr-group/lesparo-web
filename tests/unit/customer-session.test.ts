import { createHmac } from "node:crypto";
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { signCustomerSession, verifyCustomerSession } from "@/lib/auth/customer-session";

beforeAll(() => {
  process.env.AUTH_SECRET = "x".repeat(40);
});

describe("customer session", () => {
  it("round-trips the customer id and session version", async () => {
    const token = await signCustomerSession("cust-1", 3);
    expect(await verifyCustomerSession(token)).toEqual({ id: "cust-1", version: 3 });
  });

  it("rejects missing, garbage and tampered tokens", async () => {
    expect(await verifyCustomerSession(undefined)).toBeNull();
    expect(await verifyCustomerSession("nope")).toBeNull();
    const token = await signCustomerSession("cust-1", 0);
    const [h, p, s] = token.split(".");
    expect(await verifyCustomerSession(`${h}.${p}.${s.slice(0, -2)}xx`)).toBeNull();
  });

  it("rejects a token for another audience, such as a Supabase or staff token", async () => {
    // Staff sign in through Supabase Auth, a separate system. Even a token signed with the customer key must fail with another audience.
    const customerKey = new Uint8Array(createHmac("sha256", process.env.AUTH_SECRET!).update("customer-session-v1").digest());
    const other = await new SignJWT({ ver: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("staff-1").setAudience("authenticated").setExpirationTime("1h").sign(customerKey);
    expect(await verifyCustomerSession(other)).toBeNull();
  });

  it("rejects a token signed with the raw secret even with the customer audience", async () => {
    const forged = await new SignJWT({ ver: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("cust-1").setAudience("abija:customer").setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
    expect(await verifyCustomerSession(forged)).toBeNull();
  });
});
