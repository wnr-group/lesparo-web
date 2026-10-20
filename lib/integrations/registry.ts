import "server-only";
import { serverEnv } from "@/lib/env";
import { MockCrm } from "./crm/mock";
import type { CrmAdapter } from "./crm/types";
import { MockEmail } from "./email/mock";
import type { EmailAdapter } from "./email/types";

// Module-level singletons so the mock keeps state for a dev server's lifetime.
let crm: CrmAdapter | null | undefined;
let email: EmailAdapter | null | undefined;

/** Returns null when no CRM is configured — callers record the job as `blocked`. */
export function getCrm(): CrmAdapter | null {
  if (crm !== undefined) return crm;
  const provider = serverEnv().CRM_PROVIDER;
  crm = provider === "mock" ? new MockCrm() : null;
  return crm;
}

export function getEmail(): EmailAdapter | null {
  if (email !== undefined) return email;
  const provider = serverEnv().EMAIL_PROVIDER;
  email = provider === "mock" ? new MockEmail() : null;
  return email;
}

export function integrationStatus() {
  const c = getCrm();
  const e = getEmail();
  return {
    crm: c ? { provider: c.provider, live: c.isLive } : null,
    email: e ? { provider: e.provider, live: e.isLive } : null,
    salesInbox: serverEnv().SALES_NOTIFICATION_EMAIL ?? null,
  };
}
