import type { CrmAdapter, CrmEnquiry } from "@/lib/integrations/crm/types";
import type { EmailAdapter } from "@/lib/integrations/email/types";
import { NotConfiguredError, isTransient, nextAttemptDelayMs, safeErrorMessage } from "@/lib/integrations/errors";

export const JOB_OPERATIONS = ["crm.create_enquiry", "email.sales_notification", "email.buyer_confirmation"] as const;
export type JobOperation = (typeof JOB_OPERATIONS)[number];

export type JobRecord = {
  id: string;
  operation: JobOperation;
  idempotency_key: string;
  attempts: number;
  max_attempts: number;
};

export type JobDeps = {
  crm: CrmAdapter | null;
  email: EmailAdapter | null;
  salesInbox: string | null;
  siteUrl: string;
  loadEnquiry: () => Promise<CrmEnquiry>;
};

export type JobOutcome =
  | { status: "succeeded"; externalId: string }
  | { status: "failed"; error: string; nextAttemptAt: Date }
  | { status: "blocked"; error: string };

export function providerFor(operation: JobOperation): "crm" | "email" {
  return operation.startsWith("crm.") ? "crm" : "email";
}

/** Whether a job can run with the current configuration (used when enqueuing). */
export function blockedReason(operation: JobOperation, deps: Pick<JobDeps, "crm" | "email" | "salesInbox">): string | null {
  if (operation === "crm.create_enquiry" && !deps.crm) return new NotConfiguredError("CRM").message;
  if (operation.startsWith("email.") && !deps.email) return new NotConfiguredError("Email provider").message;
  if (operation === "email.sales_notification" && !deps.salesInbox) return new NotConfiguredError("SALES_NOTIFICATION_EMAIL").message;
  return null;
}

function itemLines(e: CrmEnquiry) {
  return e.items.map((i) => `- ${i.productName}${i.quantity ? ` × ${i.quantity}` : ""}${i.specifications ? ` (${i.specifications})` : ""}`).join("\n");
}

/** Executes one job attempt. Never throws: every result is an outcome to persist. */
export async function executeJob(job: JobRecord, deps: JobDeps, now = new Date()): Promise<JobOutcome> {
  const reason = blockedReason(job.operation, deps);
  if (reason) return { status: "blocked", error: reason };

  try {
    const enquiry = await deps.loadEnquiry();
    switch (job.operation) {
      case "crm.create_enquiry": {
        const { externalId } = await deps.crm!.createEnquiry(enquiry, job.idempotency_key);
        return { status: "succeeded", externalId };
      }
      case "email.sales_notification": {
        const { externalId } = await deps.email!.send(
          {
            to: deps.salesInbox!,
            replyTo: enquiry.contact.email,
            subject: `New wholesale enquiry ${enquiry.enquiryNumber} — ${enquiry.company?.name ?? enquiry.contact.name}`,
            text: `${enquiry.contact.name}${enquiry.company ? ` (${enquiry.company.name})` : ""}\n${enquiry.contact.email} · ${enquiry.contact.phone}${enquiry.contact.country ? ` · ${enquiry.contact.country}` : ""}\n\n${itemLines(enquiry)}\n\n${enquiry.message}\n\nOpen in admin: ${deps.siteUrl}/admin/enquiries/${enquiry.websiteEnquiryId}`,
          },
          job.idempotency_key,
        );
        return { status: "succeeded", externalId };
      }
      case "email.buyer_confirmation": {
        const { externalId } = await deps.email!.send(
          {
            to: enquiry.contact.email,
            subject: `We received your enquiry ${enquiry.enquiryNumber} — LESPARO`,
            text: `Dear ${enquiry.contact.name},\n\nThank you for your enquiry. Our sales team will review it and get back to you.\n\nYour reference: ${enquiry.enquiryNumber}\n\n${itemLines(enquiry)}\n\nLESPARO — Abija Exports, Erode`,
          },
          job.idempotency_key,
        );
        return { status: "succeeded", externalId };
      }
    }
  } catch (err) {
    const error = safeErrorMessage(err);
    const attempt = job.attempts + 1;
    if (!isTransient(err) || attempt >= job.max_attempts) return { status: "blocked", error };
    return { status: "failed", error, nextAttemptAt: new Date(now.getTime() + nextAttemptDelayMs(attempt)) };
  }
}
