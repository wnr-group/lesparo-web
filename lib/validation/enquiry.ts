import { z } from "zod";

export const ENQUIRY_STATUSES = [
  "new",
  "under_review",
  "info_required",
  "quotation_prepared",
  "quotation_sent",
  "accepted",
  "rejected",
  "closed",
] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  under_review: "Under review",
  info_required: "Additional information required",
  quotation_prepared: "Quotation prepared",
  quotation_sent: "Quotation sent",
  accepted: "Accepted",
  rejected: "Rejected",
  closed: "Closed",
};

export const ATTACHMENT_RULES = {
  maxFiles: 3,
  maxBytes: 8 * 1024 * 1024,
  accept: ".jpg,.jpeg,.png,.webp,.pdf",
} as const;

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const enquiryItemSchema = z
  .object({
    productId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    productName: optionalText(160),
    // Blank means "not given": without the preprocess, "" would coerce to 0 and fail min(1).
    quantity: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.replace(/[,\s]/g, "") : v),
      z.coerce
        .number({ error: "Enter a quantity in pieces." })
        .int("Use whole pieces.")
        .min(1, "Quantity must be at least 1.")
        .max(10_000_000, "That quantity looks too large.")
        .optional(),
    ),
    specifications: optionalText(1000),
  })
  .refine((item) => item.productId || item.productName, {
    message: "Choose a product or describe what you need.",
    path: ["productName"],
  });

export const enquirySchema = z.object({
  idempotencyKey: z.uuid(),
  customerName: trimmed(120).min(2, "Please enter your name."),
  companyName: optionalText(160),
  email: z.email("Enter a valid email address.").trim().max(200),
  phone: trimmed(32)
    .min(7, "Enter a phone number with country code.")
    .regex(/^\+?[0-9 ()-]{7,}$/, "Use digits, spaces and an optional leading +."),
  country: optionalText(80),
  message: trimmed(4000).min(10, "Tell us a little about your requirement (at least 10 characters)."),
  targetBudget: optionalText(120),
  items: z.array(enquiryItemSchema).min(1, "Add at least one product or requirement.").max(20, "Up to 20 lines per enquiry."),
  consent: z.literal(true, { error: "Please confirm we may contact you about this enquiry." }),
  // Honeypot: real users never fill this.
  website: z.string().max(0).optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const enquiryUpdateSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
  quotationAmount: z.coerce.number().min(0).max(1e12).optional(),
  quotationCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. INR.")
    .optional(),
  quotationValidUntil: z.iso.date().optional(),
  quotationDetails: optionalText(4000),
  followUpAt: z.iso.datetime({ local: true }).optional(),
  followUpOutcome: optionalText(1000),
});

export const enquiryNoteSchema = z.object({
  note: trimmed(4000).min(1, "Note cannot be empty."),
});
