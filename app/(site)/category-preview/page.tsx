import type { Metadata } from "next";
import { getCategoryGroups } from "@/components/site/category-data";
import { AudienceMosaic, ArchRows, IndexList } from "@/components/site/category-variants";
import { ShopByCategory } from "@/components/site/shop-by-category";

export const metadata: Metadata = { title: "Category preview", robots: { index: false, follow: false } };

/** Staging only: "Shop by category" design options, not linked from the site. */
export default async function CategoryPreview() {
  const groups = await getCategoryGroups();
  const label = (t: string) => <p className="bg-ink px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-white">{t}</p>;
  return (
    <>
      {label("A. Arched rows")}
      <ArchRows groups={groups} />
      {label("B. Index list")}
      <IndexList groups={groups} />
      {label("C. Audience mosaic")}
      <AudienceMosaic groups={groups} />
      {label("D. Tabs (the Technosport-style one)")}
      <ShopByCategory tabs={groups} />
    </>
  );
}
