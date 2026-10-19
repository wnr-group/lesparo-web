import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { ATTACHMENT_RULES, type EnquiryInput } from "@/lib/validation/enquiry";
import { safeDisplayName, sniffFileType } from "./file-sniff";
import { jobsForNewEnquiry } from "./jobs";

export type SubmitResult =
  | { ok: true; enquiryId: string; enquiryNumber: string; attachmentWarning?: string }
  | { ok: false; reason: "rate_limited" | "invalid_files" | "server_error"; message: string; field?: string };

type ValidatedFile = { name: string; bytes: Uint8Array; mime: string; ext: string };

export function validateAttachments(files: File[]): Promise<{ ok: true; files: ValidatedFile[] } | { ok: false; message: string }> {
  return (async () => {
    const real = files.filter((f) => f.size > 0);
    if (real.length > ATTACHMENT_RULES.maxFiles) return { ok: false, message: `Attach up to ${ATTACHMENT_RULES.maxFiles} files.` };
    const out: ValidatedFile[] = [];
    for (const f of real) {
      if (f.size > ATTACHMENT_RULES.maxBytes) return { ok: false, message: `${safeDisplayName(f.name)} is larger than 8 MB.` };
      const bytes = new Uint8Array(await f.arrayBuffer());
      const type = sniffFileType(bytes);
      if (!type) return { ok: false, message: `${safeDisplayName(f.name)} is not a JPG, PNG, WebP or PDF file.` };
      out.push({ name: safeDisplayName(f.name), bytes, mime: type.mime, ext: type.ext });
    }
    return { ok: true, files: out };
  })();
}

export function rateLimitKey(clientId: string) {
  return "enquiry:" + createHash("sha256").update(`${serverEnv().RATE_LIMIT_SALT}:${clientId}`).digest("hex").slice(0, 32);
}

/**
 * Stores a validated enquiry. Idempotent on input.idempotencyKey: resubmitting the same
 * form (double click, retry after a network error) returns the original enquiry.
 */
export async function submitEnquiry(input: EnquiryInput, files: File[], clientId: string): Promise<SubmitResult> {
  const db = createServiceClient();

  const { data: allowed, error: rlError } = await db.rpc("hit_rate_limit", { p_key: rateLimitKey(clientId), p_max: 5, p_window_seconds: 600 });
  if (rlError) {
    console.error("[enquiry] rate limit check failed", rlError.code);
    return { ok: false, reason: "server_error", message: "We could not submit your enquiry. Please try again." };
  }
  if (!allowed) return { ok: false, reason: "rate_limited", message: "Too many enquiries from this connection. Please wait a few minutes or contact us by phone." };

  const checked = await validateAttachments(files);
  if (!checked.ok) return { ok: false, reason: "invalid_files", message: checked.message, field: "attachments" };

  const { data, error } = await db.rpc("create_wholesale_enquiry", {
    p: {
      idempotency_key: input.idempotencyKey,
      customer_name: input.customerName,
      company_name: input.companyName ?? "",
      email: input.email,
      phone: input.phone,
      country: input.country ?? "",
      message: input.message,
      target_budget: input.targetBudget ?? "",
      items: input.items.map((i) => ({
        product_id: i.productId ?? "",
        product_name: i.productName ?? "",
        quantity: i.quantity ?? "",
        specifications: i.specifications ?? "",
      })),
    },
    p_jobs: jobsForNewEnquiry(),
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    console.error("[enquiry] create failed", error?.code, error?.message);
    return { ok: false, reason: "server_error", message: "We could not submit your enquiry. Please try again." };
  }

  let attachmentWarning: string | undefined;
  if (row.created && checked.files.length) {
    for (const f of checked.files) {
      const storagePath = `enquiries/${row.id}/${randomUUID()}.${f.ext}`;
      const up = await db.storage.from("enquiry-attachments").upload(storagePath, f.bytes, { contentType: f.mime, upsert: false });
      const ins = up.error
        ? up
        : await db.from("enquiry_attachments").insert({ enquiry_id: row.id, storage_path: storagePath, original_filename: f.name, content_type: f.mime, file_size: f.bytes.byteLength });
      if (ins.error) {
        console.error("[enquiry] attachment failed", row.enquiry_number, ins.error.message);
        attachmentWarning = "Your enquiry was received, but one or more files could not be attached. Please email them to us quoting your reference.";
      }
    }
  }

  return { ok: true, enquiryId: row.id, enquiryNumber: row.enquiry_number, attachmentWarning };
}
