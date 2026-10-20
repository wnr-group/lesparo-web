"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { fieldErrors, parseEnquiryForm, type FieldErrors } from "@/lib/services/enquiry-form";
import { submitEnquiry } from "@/lib/services/enquiries";
import { processEntityJobs } from "@/lib/services/jobs";

export type EnquiryFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields: FieldErrors; values: Record<string, string> }
  | { status: "success"; enquiryNumber: string; warning?: string };

const ECHO_FIELDS = ["customerName", "companyName", "email", "phone", "country", "targetBudget", "message"] as const;

/** React resets uncontrolled fields after an action; echo text values back so nothing typed is lost. */
function echo(fd: FormData) {
  const values: Record<string, string> = {};
  for (const k of ECHO_FIELDS) {
    const v = fd.get(k);
    if (typeof v === "string") values[k] = v.slice(0, 4000);
  }
  if (fd.get("consent") === "on") values.consent = "on";
  return values;
}

export async function submitEnquiryAction(_prev: EnquiryFormState, formData: FormData): Promise<EnquiryFormState> {
  const parsed = parseEnquiryForm(formData);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    // A filled honeypot means a bot: respond as if accepted, store nothing.
    if (fields.website) return { status: "success", enquiryNumber: "—" };
    return { status: "error", message: "Please check the highlighted fields.", fields, values: echo(formData) };
  }

  const h = await headers();
  const clientId = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);

  const result = await submitEnquiry(parsed.data, files, clientId);
  if (!result.ok) {
    return { status: "error", message: result.message, fields: result.field ? { [result.field]: result.message } : {}, values: echo(formData) };
  }

  // CRM sync and notifications run after the response; failures stay visible in admin.
  after(() => processEntityJobs(result.enquiryId).catch((err) => console.error("[enquiry] job processing failed", err)));
  return { status: "success", enquiryNumber: result.enquiryNumber, warning: result.attachmentWarning };
}
