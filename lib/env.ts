import "server-only";
import { z } from "zod";

/**
 * Server-only configuration. Public values (NEXT_PUBLIC_*) are read directly where needed;
 * everything secret is validated here and must never be imported by client components.
 * DATABASE_URL, STORAGE_DIR and AUTH_SECRET are read by lib/db.ts, lib/storage.ts and
 * lib/auth/session.ts.
 */
/** A blank value in .env.local (KEY=) means "not set", not an invalid value. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optional = <T extends z.ZodType>(t: T) => z.preprocess(blankToUndefined, t.optional());

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  RATE_LIMIT_SALT: z.string().min(8),
  CRM_PROVIDER: z.enum(["none", "mock"]).default("none"),
  EMAIL_PROVIDER: z.enum(["none", "mock"]).default("none"),
  SALES_NOTIFICATION_EMAIL: optional(z.email()),
  // Razorpay: online payment stays off until both the key pair is set. The webhook secret is needed to receive payment events.
  RAZORPAY_KEY_ID: optional(z.string().min(1)),
  RAZORPAY_KEY_SECRET: optional(z.string().min(1)),
  RAZORPAY_WEBHOOK_SECRET: optional(z.string().min(1)),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server configuration: ${missing}. See .env.example.`);
  }
  if (process.env.NODE_ENV === "production" && (parsed.data.CRM_PROVIDER === "mock" || parsed.data.EMAIL_PROVIDER === "mock")) {
    throw new Error("Mock integration providers are not allowed in production.");
  }
  cached = parsed.data;
  return cached;
}
