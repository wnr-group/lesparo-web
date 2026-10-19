import "server-only";
import { z } from "zod";

/**
 * Server-only configuration. Public values (NEXT_PUBLIC_*) are read directly where needed;
 * everything secret is validated here and must never be imported by client components.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  RATE_LIMIT_SALT: z.string().min(8),
  CRM_PROVIDER: z.enum(["none", "mock"]).default("none"),
  EMAIL_PROVIDER: z.enum(["none", "mock"]).default("none"),
  SALES_NOTIFICATION_EMAIL: z.email().optional(),
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
