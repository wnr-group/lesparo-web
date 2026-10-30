import "server-only";
import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import type { CrmEnquiry } from "@/lib/integrations/crm/types";
import { getCrm, getEmail } from "@/lib/integrations/registry";
import { blockedReason, executeJob, type JobOperation, type JobRecord } from "./job-runner";

export function currentDeps() {
  return { crm: getCrm(), email: getEmail(), salesInbox: serverEnv().SALES_NOTIFICATION_EMAIL ?? null };
}

/** Jobs to enqueue for a new enquiry, with status reflecting current configuration. */
export function jobsForNewEnquiry() {
  const deps = currentDeps();
  const all: JobOperation[] = ["crm.create_enquiry", "email.sales_notification", "email.buyer_confirmation"];
  // Enquiries are received in the admin panel. A CRM or email step is queued only once that provider is configured;
  // with none set up there is nothing to queue, so no "blocked" jobs pile up.
  const ops = all.filter((operation) => (operation.startsWith("crm.") ? deps.crm : deps.email));
  return ops.map((operation) => {
    const reason = blockedReason(operation, deps);
    return {
      provider: operation.startsWith("crm.") ? (deps.crm?.provider ?? "crm") : (deps.email?.provider ?? "email"),
      operation,
      status: reason ? "blocked" : "pending",
      last_error: reason,
    };
  });
}

async function loadCrmEnquiry(enquiryId: string): Promise<CrmEnquiry> {
  const data = await prisma.wholesaleEnquiry.findUnique({ where: { id: enquiryId }, include: { items: { orderBy: { display_order: "asc" } } } });
  if (!data) throw new Error(`Enquiry ${enquiryId} not found`);
  return {
    websiteEnquiryId: data.id,
    enquiryNumber: data.enquiry_number,
    contact: { name: data.customer_name, email: data.email, phone: data.phone, country: data.country },
    company: data.company_name ? { name: data.company_name } : null,
    message: data.message,
    targetBudget: data.target_budget,
    items: data.items.map((i) => ({ productName: i.product_name_snapshot, quantity: i.quantity, specifications: i.specifications })),
    source: "website",
    submittedAt: data.created_at.toISOString(),
  };
}

/**
 * Claims and runs one job. The conditional update is the lock: two workers cannot both
 * move the same row from pending/failed to running.
 */
export async function processJob(jobId: string): Promise<void> {
  const { count } = await prisma.integrationJob.updateMany({
    where: { id: jobId, status: { in: ["pending", "failed"] }, next_attempt_at: { lte: new Date() } },
    data: { status: "running" },
  });
  if (!count) return;
  const claimed = await prisma.integrationJob.findUniqueOrThrow({
    where: { id: jobId },
    select: { id: true, operation: true, idempotency_key: true, attempts: true, max_attempts: true, entity_id: true },
  });

  const outcome = await executeJob(claimed as JobRecord, {
    ...currentDeps(),
    siteUrl: serverEnv().NEXT_PUBLIC_SITE_URL,
    loadEnquiry: () => loadCrmEnquiry(claimed.entity_id),
  });

  const attempts = claimed.attempts + (outcome.status === "blocked" && outcome.error.includes("not configured") ? 0 : 1);
  await prisma.integrationJob.update({
    where: { id: jobId },
    data: {
      status: outcome.status,
      attempts,
      last_error: outcome.status === "succeeded" ? null : outcome.error,
      external_id: outcome.status === "succeeded" ? outcome.externalId : null,
      next_attempt_at: outcome.status === "failed" ? outcome.nextAttemptAt : new Date(),
    },
  });

  if (claimed.operation === "crm.create_enquiry") {
    const syncStatus = outcome.status === "succeeded" ? "synced" : outcome.status === "failed" ? "pending" : outcome.error.includes("not configured") ? "not_configured" : "failed";
    await prisma.wholesaleEnquiry.update({
      where: { id: claimed.entity_id },
      data: { crm_sync_status: syncStatus, ...(outcome.status === "succeeded" ? { crm_record_id: outcome.externalId } : {}) },
    });
  }

  if (outcome.status !== "succeeded") console.warn(`[jobs] ${claimed.operation} ${jobId}: ${outcome.status} — ${outcome.error}`);
}

export async function processEntityJobs(entityId: string) {
  const jobs = await prisma.integrationJob.findMany({ where: { entity_id: entityId, status: { in: ["pending", "failed"] } }, select: { id: true } });
  for (const job of jobs) await processJob(job.id);
}

/** Processes all due jobs. Run on a schedule (see docs/deployment.md). */
export async function processDueJobs(limit = 50) {
  const jobs = await prisma.integrationJob.findMany({
    where: { status: { in: ["pending", "failed"] }, next_attempt_at: { lte: new Date() } },
    orderBy: { next_attempt_at: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const job of jobs) await processJob(job.id);
  return jobs.length;
}

/** Staff-triggered retry of a blocked/failed job (re-checks configuration). */
export async function retryJob(jobId: string) {
  await prisma.integrationJob.updateMany({
    where: { id: jobId, status: { in: ["blocked", "failed"] } },
    data: { status: "pending", attempts: 0, next_attempt_at: new Date() },
  });
  await processJob(jobId);
}
