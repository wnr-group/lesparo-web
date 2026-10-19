import "server-only";
import { serverEnv } from "@/lib/env";
import type { CrmEnquiry } from "@/lib/integrations/crm/types";
import { getCrm, getEmail } from "@/lib/integrations/registry";
import { createServiceClient } from "@/lib/supabase/server";
import { blockedReason, executeJob, type JobOperation, type JobRecord } from "./job-runner";

export function currentDeps() {
  return { crm: getCrm(), email: getEmail(), salesInbox: serverEnv().SALES_NOTIFICATION_EMAIL ?? null };
}

/** Jobs to enqueue for a new enquiry, with status reflecting current configuration. */
export function jobsForNewEnquiry() {
  const deps = currentDeps();
  const ops: JobOperation[] = ["crm.create_enquiry", "email.sales_notification", "email.buyer_confirmation"];
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
  const db = createServiceClient();
  const { data, error } = await db
    .from("wholesale_enquiries")
    .select("id, enquiry_number, customer_name, company_name, email, phone, country, message, target_budget, created_at, enquiry_items(product_name_snapshot, quantity, specifications, display_order)")
    .eq("id", enquiryId)
    .single();
  if (error || !data) throw new Error(`Enquiry ${enquiryId} not found`);
  return {
    websiteEnquiryId: data.id,
    enquiryNumber: data.enquiry_number,
    contact: { name: data.customer_name, email: data.email, phone: data.phone, country: data.country },
    company: data.company_name ? { name: data.company_name } : null,
    message: data.message,
    targetBudget: data.target_budget,
    items: [...data.enquiry_items]
      .sort((a, b) => a.display_order - b.display_order)
      .map((i) => ({ productName: i.product_name_snapshot, quantity: i.quantity, specifications: i.specifications })),
    source: "website",
    submittedAt: data.created_at,
  };
}

/**
 * Claims and runs one job. The conditional update is the lock: two workers cannot both
 * move the same row from pending/failed to running.
 */
export async function processJob(jobId: string): Promise<void> {
  const db = createServiceClient();
  const { data: claimed } = await db
    .from("integration_jobs")
    .update({ status: "running" })
    .eq("id", jobId)
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .select("id, operation, idempotency_key, attempts, max_attempts, entity_id")
    .maybeSingle();
  if (!claimed) return;

  const outcome = await executeJob(claimed as JobRecord, {
    ...currentDeps(),
    siteUrl: serverEnv().NEXT_PUBLIC_SITE_URL,
    loadEnquiry: () => loadCrmEnquiry(claimed.entity_id),
  });

  const attempts = claimed.attempts + (outcome.status === "blocked" && outcome.error.includes("not configured") ? 0 : 1);
  await db
    .from("integration_jobs")
    .update({
      status: outcome.status,
      attempts,
      last_error: outcome.status === "succeeded" ? null : outcome.error,
      external_id: outcome.status === "succeeded" ? outcome.externalId : null,
      next_attempt_at: outcome.status === "failed" ? outcome.nextAttemptAt.toISOString() : new Date().toISOString(),
    })
    .eq("id", jobId);

  if (claimed.operation === "crm.create_enquiry") {
    const syncStatus = outcome.status === "succeeded" ? "synced" : outcome.status === "failed" ? "pending" : outcome.error.includes("not configured") ? "not_configured" : "failed";
    await db
      .from("wholesale_enquiries")
      .update({ crm_sync_status: syncStatus, ...(outcome.status === "succeeded" ? { crm_record_id: outcome.externalId } : {}) })
      .eq("id", claimed.entity_id);
  }

  if (outcome.status !== "succeeded") console.warn(`[jobs] ${claimed.operation} ${jobId}: ${outcome.status} — ${outcome.error}`);
}

export async function processEntityJobs(entityId: string) {
  const db = createServiceClient();
  const { data } = await db.from("integration_jobs").select("id").eq("entity_id", entityId).in("status", ["pending", "failed"]);
  for (const job of data ?? []) await processJob(job.id);
}

/** Processes all due jobs. Run on a schedule (see docs/deployment.md). */
export async function processDueJobs(limit = 50) {
  const db = createServiceClient();
  const { data } = await db
    .from("integration_jobs")
    .select("id")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at")
    .limit(limit);
  for (const job of data ?? []) await processJob(job.id);
  return data?.length ?? 0;
}

/** Staff-triggered retry of a blocked/failed job (re-checks configuration). */
export async function retryJob(jobId: string) {
  const db = createServiceClient();
  await db
    .from("integration_jobs")
    .update({ status: "pending", attempts: 0, next_attempt_at: new Date().toISOString() })
    .eq("id", jobId)
    .in("status", ["blocked", "failed"]);
  await processJob(jobId);
}
