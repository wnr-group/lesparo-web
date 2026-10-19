import { z } from "zod";

/** Internal paths ("/shop") or absolute https URLs only — no javascript: or protocol-relative links. */
export const linkSchema = z
  .string()
  .trim()
  .max(300)
  .refine((v) => (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/[^\s]+$/.test(v), {
    message: "Use a site path like /shop or a full https:// URL.",
  });

const cta = z.object({ label: z.string().trim().min(1).max(40), href: linkSchema });

/**
 * Homepage content. Text marked `approved: false` is rendered only to staff previews;
 * the public site falls back to neutral copy until the business approves it.
 */
export const homepageSchema = z.object({
  hero: z.object({
    eyebrow: z.string().trim().max(80),
    heading: z.string().trim().min(1).max(120),
    subheading: z.string().trim().max(300),
    primaryCta: cta,
    secondaryCta: cta,
    imagePath: z.string().trim().max(400).nullable(),
  }),
  featuredCategorySlugs: z.array(z.string()).max(8),
  featuredProductSlugs: z.array(z.string()).max(12),
  story: z.object({
    approved: z.boolean(),
    heading: z.string().trim().max(120),
    body: z.string().trim().max(2000),
  }),
  sections: z.object({
    categories: z.boolean(),
    products: z.boolean(),
    story: z.boolean(),
    fabrics: z.boolean(),
    wholesale: z.boolean(),
  }),
});

export type HomepageContent = z.infer<typeof homepageSchema>;

/**
 * Default content. Every statement is taken from lesparo.com (Company History page,
 * catalogue and contact pages). Nothing here is a new business claim.
 */
export const DEFAULT_HOMEPAGE: HomepageContent = {
  hero: {
    eyebrow: "Abija Exports · Erode, Tamil Nadu",
    heading: "Knitted and woven textiles from Erode.",
    subheading:
      "Gents and kids casual wear, lungis, kavi dhothies, towels and kerchiefs from LESPARO — supplied to showrooms across Tamil Nadu, Kerala and Karnataka.",
    primaryCta: { label: "Explore the collection", href: "/shop" },
    secondaryCta: { label: "Wholesale enquiries", href: "/wholesale" },
    imagePath: null,
  },
  featuredCategorySlugs: [],
  featuredProductSlugs: [],
  story: {
    approved: true,
    heading: "Four decades of textiles from Erode",
    body:
      "The family business began in 1979, when Mr. Yuvaraj founded R. Yuvaraj in Erode, known for lungis, dhoties and mull cloth supplied to Kerala. Y. Sathish joined in 1999 and started Y. Sathish & Co. in 2001. In 2017 he launched Abija Exports, the unit behind LESPARO, making knitted and woven casual wear for gents and kids.",
  },
  sections: { categories: true, products: true, story: true, fabrics: true, wholesale: true },
};
