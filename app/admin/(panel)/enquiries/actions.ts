"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { fieldErrors } from "@/lib/services/enquiry-form";
import { retryJob } from "@/lib/services/jobs";
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
    const session = await requireStaff();
    const parsed = enquiryUpdateSchema.safeParse(emptyToUndefined(fd));
    if (!parsed.success) return { error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    const v = parsed.data;
    const enquiryId = z.uuid().parse(id);
    // Staff may only change workflow fields, never buyer-submitted data.
    await prisma.$transaction(async (tx) => {
      const before = await tx.wholesaleEnquiry.findUniqueOrThrow({ where: { id: enquiryId }, select: { status: true } });
      await tx.wholesaleEnquiry.update({
        where: { id: enquiryId },
        data: {
          status: v.status,
          quotation_amount: v.quotationAmount ?? null,
          quotation_currency: v.quotationAmount !== undefined ? (v.quotationCurrency ?? "INR") : null,
          quotation_valid_until: v.quotationValidUntil ?? null,
          quotation_details: v.quotationDetails ?? null,
          follow_up_at: v.followUpAt ? new Date(`${v.followUpAt}+05:30`) : null,
          follow_up_outcome: v.followUpOutcome ?? null,
        },
      });
      if (before.status !== v.status) {
        await tx.enquiryStatusHistory.create({ data: { enquiry_id: enquiryId, from_status: before.status, to_status: v.status, changed_by: session.userId } });
      }
    });
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
    await prisma.enquiryNote.create({ data: { enquiry_id: z.uuid().parse(id), author_id: session.userId, note: parsed.data.note } });
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function retryIntegrationJob(jobId: string): Promise<ActionState> {
  try {
    await requireStaff();
    const id = z.uuid().parse(jobId);
    if (!(await prisma.integrationJob.findUnique({ where: { id }, select: { id: true } }))) return { error: "Job not found." };
    await retryJob(id);
    const after = await prisma.integrationJob.findUnique({ where: { id }, select: { status: true, last_error: true } });
    refresh();
    return after?.status === "succeeded" ? { ok: true } : { error: after?.last_error ?? "The job did not complete." };
  } catch (err) {
    return failure(err);
  }
}
