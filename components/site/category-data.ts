import { getCategoryBySlug, getCategoryTree, listProducts, type CategoryNode } from "@/lib/catalogue/queries";
import type { CategoryTab } from "@/components/site/shop-by-category";

/** Every category grouped by audience, each with its cover image or else the first product photo in it. */
export async function getCategoryGroups(): Promise<CategoryTab[]> {
  const tree = await getCategoryTree();
  const garments = tree.find((t) => t.slug === "garments");
  const flatten = (n: CategoryNode): CategoryNode[] => [n, ...n.children.flatMap(flatten)];
  const bySlug = new Map((garments ? flatten(garments) : tree.flatMap(flatten)).map((c) => [c.slug, c]));

  const photoFor = async (c: CategoryNode) => {
    if (c.coverUrl) return c.coverUrl;
    const cat = await getCategoryBySlug(c.slug);
    if (!cat) return null;
    const { products } = await listProducts({ sort: "newest", pageSize: 12, categoryIds: cat.subtreeIds });
    return products.find((p) => p.images.length > 0)?.images[0].url ?? null;
  };
  const toItems = (cats: CategoryNode[]) => Promise.all(cats.map(async (c) => ({ name: c.name, href: `/collections/${c.slug}`, src: await photoFor(c) })));
  const kids = (r: CategoryNode) => (r.children.length ? r.children : [r]);

  const defs = [
    { key: "men", label: "Men", slugs: ["gents"], href: "/collections/gents" },
    { key: "women", label: "Women", slugs: ["women"], href: "/collections/women" },
    { key: "kids", label: "Kids", slugs: ["kids"], href: "/collections/kids" },
    { key: "boys", label: "Boys", slugs: ["boys"], href: "/collections/boys" },
    { key: "collections", label: "Collections", slugs: ["hoodies", "new-styles"], href: "/shop" },
  ];
  const groups = await Promise.all(
    defs.map(async (d) => {
      const roots = d.slugs.map((s) => bySlug.get(s)).filter((c): c is CategoryNode => !!c);
      if (!roots.length) return null;
      return { key: d.key, label: d.label, href: d.href, items: await toItems(roots.flatMap(kids)) };
    }),
  );
  const others = tree.filter((r) => r.slug !== "garments").flatMap(kids);
  const out = groups.filter((g): g is CategoryTab => !!g);
  if (others.length) out.push({ key: "more", label: "More", href: "/shop", items: await toItems(others) });
  return out;
}
