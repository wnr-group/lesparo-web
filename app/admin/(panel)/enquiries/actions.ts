"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireStaff } from "@/lib/auth/staff";
import { fieldErrors } from "@/lib/services/enquiry-form";
import { retryJob } from "@/lib/services/jobs";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { enquiryNoteSchema, enquiryUpdateSchema } from "@/lib/validation/enquiry";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const emptyToUndefined = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== ""));

function failure(err: unknown): ActionState {
  if (err instanceof AuthorizationError) return { error: err.message };
  console.error("[admin/enquiries]", err);
  return { error: "Something went wrong. Please try again." };
}

export async function updateEnquiry(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requireStaff();
    const parsed = enquiryUpdateSchema.safeParse(emptyToUndefined(fd));
    if (!parsed.success) return { error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    const v = parsed.data;
    const db = await createClient();
    const { error } = await db
      .from("wholesale_enquiries")
      .update({
        status: v.status,
        quotation_amount: v.quotationAmount ?? null,
        quotation_currency: v.quotationAmount !== undefined ? (v.quotationCurrency ?? "INR") : null,
        quotation_valid_until: v.quotationValidUntil ?? null,
        quotation_details: v.quotationDetails ?? null,
        follow_up_at: v.followUpAt ? new Date(`${v.followUpAt}+05:30`).toISOString() : null,
        follow_up_outcome: v.followUpOutcome ?? null,
      })
      .eq("id", z.uuid().parse(id));
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function addNote(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireStaff();
    const parsed = enquiryNoteSchema.safeParse({ note: fd.get("note") });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const db = await createClient();
    const { error } = await db.from("enquiry_notes").insert({ enquiry_id: z.uuid().parse(id), author_id: session.userId, note: parsed.data.note });
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function retryIntegrationJob(jobId: string): Promise<ActionState> {
  try {
    await requireStaff();
    // Confirm the job is visible to this staff member (RLS) before acting with the service role.
    const db = await createClient();
    const { data } = await db.from("integration_jobs").select("id").eq("id", z.uuid().parse(jobId)).maybeSingle();
    if (!data) return { error: "Job not found." };
    await retryJob(jobId);
    const { data: after } = await createServiceClient().from("integration_jobs").select("status, last_error").eq("id", jobId).single();
    refresh();
    return after?.status === "succeeded" ? { ok: true } : { error: after?.last_error ?? "The job did not complete." };
  } catch (err) {
    return failure(err);
  }
}
