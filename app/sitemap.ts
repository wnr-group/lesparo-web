import type { MetadataRoute } from "next";
import { getAllPublishedSlugs } from "@/lib/catalogue/queries";
import { POLICIES } from "@/lib/policies";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { products, categories } = await getAllPublishedSlugs();
  const pages = ["", "/shop", "/collections", "/wholesale", "/about", "/contact"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const }));
  return [
    ...pages,
    ...categories.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: c.updated_at, changeFrequency: "weekly" as const })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updated_at, changeFrequency: "monthly" as const })),
    ...POLICIES.map((p) => ({ url: `${base}/policies/${p.slug}` })),
  ];
}
