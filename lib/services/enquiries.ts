import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { removeFile, saveFile } from "@/lib/storage";
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

/** Fixed-window counter: true while the key is within `max` hits for the current window. */
export async function hitRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const window_start = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const row = await prisma.rateLimit.upsert({
    where: { key_window_start: { key, window_start } },
    create: { key, window_start, hits: 1 },
    update: { hits: { increment: 1 } },
  });
  await prisma.rateLimit.deleteMany({ where: { window_start: { lt: new Date(Date.now() - 86_400_000) } } });
  return row.hits <= max;
}

/**
 * Creates the enquiry, its items, the first status-history entry and its outbox jobs in one
 * transaction. Idempotent on idempotency_key: a repeat returns the original with created=false.
 */
async function createEnquiry(input: EnquiryInput) {
  const existing = await prisma.wholesaleEnquiry.findUnique({ where: { idempotency_key: input.idempotencyKey }, select: { id: true, enquiry_number: true } });
  if (existing) return { ...existing, created: false };

  const jobs = jobsForNewEnquiry();
  return prisma.$transaction(async (tx) => {
    const counter = await tx.counter.upsert({ where: { name: "enquiry_number" }, create: { name: "enquiry_number", value: 1 }, update: { value: { increment: 1 } } });
    const year = new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
    const enquiryNumber = `LSP-${year}-${String(counter.value).padStart(5, "0")}`;

    const productIds = input.items.map((i) => i.productId).filter((x): x is string => !!x);
    const products = productIds.length ? await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [];

    const enquiry = await tx.wholesaleEnquiry.create({
      data: {
        enquiry_number: enquiryNumber,
        idempotency_key: input.idempotencyKey,
        customer_name: input.customerName,
        company_name: input.companyName || null,
        email: input.email,
        phone: input.phone,
        country: input.country || null,
        message: input.message,
        target_budget: input.targetBudget || null,
        consent_at: new Date(),
        items: {
          create: input.items.map((i, order) => {
            const product = products.find((p) => p.id === i.productId);
            return {
              product_id: product?.id ?? null,
              product_name_snapshot: product?.name ?? i.productName ?? "",
              quantity: i.quantity ?? null,
              specifications: i.specifications || null,
              display_order: order,
            };
          }),
        },
        status_history: { create: { to_status: "new" } },
      },
      select: { id: true, enquiry_number: true },
    });

    await tx.integrationJob.createMany({
      data: jobs.map((j) => ({
        provider: j.provider,
        operation: j.operation,
        entity_type: "wholesale_enquiry",
        entity_id: enquiry.id,
        idempotency_key: `${j.operation}:${enquiry.id}`,
        status: j.status,
        last_error: j.last_error,
      })),
    });
    return { ...enquiry, created: true };
  });
}

/**
 * Stores a validated enquiry. Idempotent on input.idempotencyKey: resubmitting the same
 * form (double click, retry after a network error) returns the original enquiry.
 */
export async function submitEnquiry(input: EnquiryInput, files: File[], clientId: string): Promise<SubmitResult> {
  let allowed: boolean;
  try {
    allowed = await hitRateLimit(rateLimitKey(clientId), 5, 600);
  } catch (err) {
    console.error("[enquiry] rate limit check failed", err);
    return { ok: false, reason: "server_error", message: "We could not submit your enquiry. Please try again." };
  }
  if (!allowed) return { ok: false, reason: "rate_limited", message: "Too many enquiries from this connection. Please wait a few minutes or contact us by phone." };

  const checked = await validateAttachments(files);
  if (!checked.ok) return { ok: false, reason: "invalid_files", message: checked.message, field: "attachments" };

  let row: Awaited<ReturnType<typeof createEnquiry>>;
  try {
    row = await createEnquiry(input);
  } catch (err) {
    console.error("[enquiry] create failed", err);
    return { ok: false, reason: "server_error", message: "We could not submit your enquiry. Please try again." };
  }

  let attachmentWarning: string | undefined;
  if (row.created && checked.files.length) {
    for (const f of checked.files) {
      const storagePath = `enquiries/${row.id}/${randomUUID()}.${f.ext}`;
      try {
        await saveFile("attachments", storagePath, f.bytes);
        await prisma.enquiryAttachment.create({
          data: { enquiry_id: row.id, storage_path: storagePath, original_filename: f.name, content_type: f.mime, file_size: f.bytes.byteLength },
        });
      } catch (err) {
        console.error("[enquiry] attachment failed", row.enquiry_number, err);
        await removeFile("attachments", storagePath).catch(() => {});
        attachmentWarning = "Your enquiry was received, but one or more files could not be attached. Please email them to us quoting your reference.";
      }
    }
  }

  return { ok: true, enquiryId: row.id, enquiryNumber: row.enquiry_number, attachmentWarning };
}
