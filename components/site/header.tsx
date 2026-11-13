import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCategoryTree, type CategoryNode } from "@/lib/catalogue/queries";
import { AnnouncementBar } from "./announcement-bar";
import type { NavColumn, NavItem, NavLink, NavTile } from "./nav/types";
import { SiteNav } from "./site-nav";

/**
 * The navigation, built from the live category tree: Shop, Men, Women, Kids, Collections, About, Wholesale, Contact.
 * A link is only added when its category exists, so a menu never points at something the catalogue does not sell.
 * Photographs: Men and Women use studio/licensed photography in public/menu (see SOURCES.txt there); Kids and Hoodies use
 * existing project photography and real catalogue product photos. Catalogue product images themselves are never altered.
 */
const cdn = (c?: CategoryNode) => c?.coverUrl ?? null;

async function buildNav(): Promise<NavItem[]> {
  const tree = await getCategoryTree();
  const garments = tree.find((t) => t.slug === "garments");
  const all = new Map<string, CategoryNode>();
  const walk = (n: CategoryNode) => {
    all.set(n.slug, n);
    n.children.forEach(walk);
  };
  (garments ? [garments] : tree).forEach(walk);
  const has = (slug: string) => all.has(slug);
  const link = (slug: string, label: string): NavLink[] => (has(slug) ? [{ label, href: `/collections/${slug}` }] : []);
  const tile = (slug: string, label: string, image: string | null, pos?: string): NavTile[] => (has(slug) && image ? [{ label, href: `/collections/${slug}`, image, pos }] : []);
  const types = (audience: string, withShorts = true): NavLink[] => [
    ...link(`${audience}-t-shirt`, "T-shirts"),
    ...link(`${audience}-tracks`, "Track pants"),
    ...(withShorts ? link(`${audience}-shorts`, "Shorts") : []),
    ...link(`${audience}-3-4th`, "3/4th pants"),
  ];
  const newest = (slug: string): NavLink[] => (has(slug) ? [{ label: "New arrivals", href: `/collections/${slug}?sort=newest` }] : []);
  const col = (title: string, links: NavLink[]): NavColumn[] => (links.length ? [{ title, links }] : []);

  const items: NavItem[] = [];

  // Shop: the whole catalogue, by audience and by range.
  items.push({
    key: "shop",
    label: "Shop",
    href: "/shop",
    panel: {
      heading: "Shop",
      blurb: "The full LESPARO catalogue: shorts, track pants, 3/4th pants, T-shirts and hoodies.",
      columns: [
        ...col("Browse", [{ label: "Shop all", href: "/shop" }, { label: "New arrivals", href: "/shop?sort=newest" }]),
        ...col("By audience", [...link("gents", "Men’s wear"), ...link("women", "Women’s wear"), ...link("kids", "Kids’ wear"), ...link("boys", "Boys’ wear")]),
        ...col("By range", [...link("hoodies", "Hoodies"), ...link("new-styles", "New styles")]),
      ],
      tiles: [{ label: "Shop all", href: "/shop", image: "/menu/men-casual.jpg", pos: "50% 22%" }],
      shape: "portrait",
      cta: { label: "Shop all", href: "/shop" },
    },
  });

  if (has("gents"))
    items.push({
      key: "men",
      label: "Men",
      href: "/collections/gents",
      panel: {
        heading: "Men",
        blurb: "Everyday shorts, tracks, 3/4ths and T-shirts, cut for comfort.",
        columns: [...col("Shop by type", [...types("gents"), ...link("hoodies", "Hoodies")]), ...col("Discover", [...newest("gents"), { label: "View all men’s products", href: "/collections/gents" }])],
        tiles: [...tile("gents-tracks", "Track pants", "/menu/men-movement.jpg", "50% 22%"), ...tile("gents-t-shirt", "T-shirts", "/menu/men-tee.jpg", "50% 22%")],
        shape: "portrait",
        cta: { label: "Explore men", href: "/collections/gents" },
      },
    });

  if (has("women"))
    items.push({
      key: "women",
      label: "Women",
      href: "/collections/women",
      panel: {
        heading: "Women",
        blurb: "T-shirts, track pants and 3/4th pants.",
        columns: [...col("Shop by type", types("women", false)), ...col("Discover", [...newest("women"), { label: "View all women’s products", href: "/collections/women" }])],
        tiles: tile("women", "Women", "/menu/women-studio.jpg", "50% 30%"),
        shape: "landscape",
        cta: { label: "Explore women", href: "/collections/women" },
      },
    });

  if (has("kids") || has("boys"))
    items.push({
      key: "kids",
      label: "Kids",
      href: "/collections/kids",
      panel: {
        heading: "Kids",
        blurb: "Sizes 20 to 28 for kids, and 30 to 36 for boys.",
        columns: [...col("Kids", [...types("kids"), ...newest("kids")]), ...col("Boys", [...types("boys"), ...newest("boys")])],
        tiles: [...tile("kids", "Kids", "/about/range-kids.jpg", "50% 25%"), ...tile("boys", "Boys", cdn(all.get("boys")), "50% 30%")],
        shape: "square",
        cta: { label: "Explore kids", href: "/collections/kids" },
      },
    });

  // Collections: only ranges that exist as their own category.
  const collections = [...link("hoodies", "Hoodies"), ...link("new-styles", "New styles")];
  if (collections.length)
    items.push({
      key: "collections",
      label: "Collections",
      href: collections[0].href,
      panel: {
        heading: "Collections",
        blurb: "Ranges that sit across audiences.",
        columns: col("Ranges", collections),
        tiles: tile("hoodies", "Hoodies", "/menu/hoodies.jpg", "50% 30%"),
        shape: "portrait",
        cta: { label: "Shop all", href: "/shop" },
      },
    });

  items.push({ key: "about", label: "About", href: "/about" }, { key: "wholesale", label: "Wholesale", href: "/wholesale" }, { key: "contact", label: "Contact", href: "/contact" });
  return items;
}

export async function Header() {
  const items = await buildNav();
  const logo = (
    <Link href="/" className="shrink-0" aria-label="LESPARO home">
      {/* Registered LESPARO mark, unaltered. */}
      <Image src="/lesparo-logo-v3.png" alt="LESPARO" width={875} height={460} priority className="h-10 w-auto transition-[height] duration-300 ease-[var(--ease-out-soft)] lg:h-11 [html[data-scrolled]_&]:lg:h-9" />
    </Link>
  );
  return (
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-0 z-30 border-b border-line/70 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/85">
      <AnnouncementBar />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      {/* usePathname() is request data: a boundary lets pages re-render after admin edits. */}
      <Suspense>
        <SiteNav items={items} logo={logo} />
      </Suspense>
    </header>
  );
}
