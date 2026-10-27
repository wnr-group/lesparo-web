import "server-only";
import { getCategoryTree, getHomepageContent, getProductsBySlugs, listProducts, type CategoryNode, type ProductCard } from "@/lib/catalogue/queries";

/** A full-length model photograph from the catalogue. */
export type Model = { id: string; slug: string; name: string; image: string; kid: boolean };

export type HomeData = {
  content: Awaited<ReturnType<typeof getHomepageContent>>;
  tree: CategoryNode[];
  garments: CategoryNode[];
  fabrics: CategoryNode | undefined;
  featured: ProductCard[];
  models: Model[];
  /** Full-length model photo per garment category id (kids use a kids model). */
  panelImages: Record<string, string>;
};

/** Everything a homepage variant needs, loaded once. Real admin content and catalogue only. */
export async function loadHomeData(): Promise<HomeData> {
  const [content, tree] = await Promise.all([getHomepageContent(), getCategoryTree()]);
  const featured = (await getProductsBySlugs(content.featuredProductSlugs)).filter((p) => p.images[0]);
  const garments = tree.find((t) => t.slug === "garments")?.children ?? [];
  const fabrics = tree.find((t) => t.slug !== "garments");

  const { products } = await listProducts({ pageSize: 200 });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const pick = (slug: string, kid = false): Model[] => {
    const p = bySlug.get(slug);
    return p?.images[0] ? [{ id: p.id, slug: p.slug, name: p.name, image: p.images[0].url, kid }] : [];
  };
  const models = [...pick("loom-kids", true), ...pick("fine-comfort-34-th"), ...pick("loom-don-track-with-rib"), ...pick("fine-comfort-track"), ...pick("new-york-kids-track", true)];

  const panelImages: Record<string, string> = {};
  for (const g of garments) {
    const m = models.find((l) => l.kid === /kid/i.test(g.slug + g.name));
    if (m) panelImages[g.id] = m.image;
  }
  return { content, tree, garments, fabrics, featured, models, panelImages };
}
