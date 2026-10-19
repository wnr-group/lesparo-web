import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const specSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(400),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(160),
    slug: slugSchema,
    sku: optionalText(64),
    categoryId: z.uuid("Choose a category.").nullable().or(z.literal("").transform(() => null)),
    description: optionalText(8000),
    fabric: optionalText(120),
    sizes: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? "")
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      ),
    packing: optionalText(160),
    specs: z.array(specSchema).max(30).default([]),
    quoteEnabled: checkbox,
    retailEnabled: checkbox,
    price: z
      .union([z.literal(""), z.coerce.number().min(0).max(1e9)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    isPublished: checkbox,
    isFeatured: checkbox,
    seoTitle: optionalText(70),
    seoDescription: optionalText(170),
  })
  .refine((p) => !p.retailEnabled || p.price !== null, {
    message: "Retail products need a price.",
    path: ["price"],
  })
  .refine((p) => p.quoteEnabled || p.retailEnabled, {
    message: "Enable quotes or retail so buyers have a way to order.",
    path: ["quoteEnabled"],
  });

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  slug: slugSchema,
  parentId: z.uuid().nullable().or(z.literal("").transform(() => null)),
  description: optionalText(600),
  displayOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  isPublished: checkbox,
  isFeatured: checkbox,
});

export type CategoryInput = z.infer<typeof categorySchema>;
