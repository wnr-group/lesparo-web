import { HeroEarthrise } from "@/components/site/hero-earthrise";
import { Home3D } from "@/components/site/home-3d/home-3d";
import type { RingItem } from "@/components/site/product-ring";
import { listProducts } from "@/lib/catalogue/queries";
import { loadHomeData } from "@/lib/home-data";

/**
 * Homepage entry point. Variant B: a tailor's-bench layout. The hero is the Earthrise banner, the indigo
 * stage with the rotating 3D product ring; drop the `hero` prop to get this variant's woven-cloth WebGL hero.
 */
export default async function HomePage() {
  const data = await loadHomeData();
  const { content, featured } = data;

  // Hero ring: featured products first, then the rest of the catalogue, ten with photos.
  const { products: catalogue } = await listProducts({ pageSize: 24 });
  const ringItems: RingItem[] = [...featured, ...catalogue]
    .filter((p, i, all) => p.images[0] && all.findIndex((q) => q.id === p.id) === i)
    .map((p) => ({ id: p.id, href: `/products/${p.slug}`, name: p.name, label: p.category?.name ?? null, image: p.images[0].url }))
    .slice(0, 10);

  return (
    <Home3D
      {...data}
      sections={content.sections}
      hero={
        <HeroEarthrise
          eyebrow={content.hero.eyebrow}
          heading={content.hero.heading}
          subheading={content.hero.subheading}
          primaryCta={content.hero.primaryCta}
          secondaryCta={content.hero.secondaryCta}
          items={ringItems}
        />
      }
    />
  );
}
