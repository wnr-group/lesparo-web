import type { z } from "zod";
import { enquirySchema } from "@/lib/validation/enquiry";

/** Converts the wholesale form's FormData (items as `items.N.field`) into schema input. */
export function formDataToEnquiryInput(fd: FormData) {
  const items: Record<string, Record<string, string>> = {};
  for (const [key, value] of fd.entries()) {
    const m = key.match(/^items\.(\d+)\.(productId|productName|quantity|specifications)$/);
    if (!m || typeof value !== "string") continue;
    (items[m[1]] ??= {})[m[2]] = value;
  }
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    idempotencyKey: str("idempotencyKey"),
    customerName: str("customerName"),
    companyName: str("companyName"),
    email: str("email"),
    phone: str("phone"),
    country: str("country"),
    message: str("message"),
    targetBudget: str("targetBudget"),
    website: str("website"),
    consent: fd.get("consent") === "on" ? true : undefined,
    items: Object.keys(items)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => items[k])
      // Ignore untouched blank rows the buyer added but did not fill.
      .filter((i) => Object.values(i).some((v) => v.trim() !== "")),
  };
}

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parseEnquiryForm(fd: FormData) {
  return enquirySchema.safeParse(formDataToEnquiryInput(fd));
}
