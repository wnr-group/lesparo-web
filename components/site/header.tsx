import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCategoryTree, type CategoryNode } from "@/lib/catalogue/queries";
import { AccountIcon, AccountMenu } from "./account-menu";
import { AnnouncementBar } from "./announcement-bar";
import type { NavColumn, NavItem, NavLink, NavTile } from "./nav/types";
import { SiteNav } from "./site-nav";
import { asset } from "@/lib/assets";

/**
 * The navigation, built from the live category tree: Shop, Men, Trending, About, Wholesale, Contact.
 * A link is only added when its category exists, so a menu never points at something the catalogue does not sell.
 * Photographs: Men and Women use studio/licensed photography in public/menu (see SOURCES.txt there); Kids and Hoodies use
 * existing project photography and real catalogue product photos. Catalogue product images themselves are never altered.
 */

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
      tiles: [{ label: "Shop all", href: "/shop", image: asset("/menu/men-casual.jpg"), pos: "50% 22%" }],
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
        tiles: [...tile("gents-tracks", "Track pants", asset("/menu/men-movement.jpg"), "50% 22%"), ...tile("gents-t-shirt", "T-shirts", asset("/menu/men-tee.jpg"), "50% 22%")],
        shape: "portrait",
        cta: { label: "Explore men", href: "/collections/gents" },
      },
    });

  // Collections: only ranges that exist as their own category.
  const collections = [...link("hoodies", "Hoodies"), ...link("new-styles", "New styles")];
  if (collections.length)
    items.push({
      key: "collections",
      label: "Trending",
      href: collections[0].href,
      panel: {
        heading: "Trending",
        blurb: "Our hoodies and newest styles, for everyone.",
        columns: col("Browse", collections),
        tiles: tile("hoodies", "Hoodies", asset("/menu/hoodies.jpg"), "50% 30%"),
        shape: "portrait",
        cta: { label: "Shop all", href: "/shop" },
      },
    });

  items.push({ key: "about", label: "About", href: "/about" }, { key: "contact", label: "Contact", href: "/contact" }, { key: "wholesale", label: "B2B Sales", href: "/wholesale" });
  return items;
}

export async function Header() {
  const items = await buildNav();
  const logo = (
    <Link href="/" className="flex shrink-0 items-center gap-3 lg:gap-4" aria-label="LESPARO home">
      {/* Bird and name shown as separate pieces. */}
      <Image src={asset("/lesparo-logo-bird.png")} alt="" width={270} height={350} priority className="h-10 w-auto transition-[height] duration-300 ease-[var(--ease-out-soft)] lg:h-12 [html[data-scrolled]_&]:lg:h-10" />
      <Image src={asset("/lesparo-wordmark.png")} alt="LESPARO" width={700} height={205} priority className="-translate-y-[13%] h-6 w-auto transition-[height] duration-300 ease-[var(--ease-out-soft)] lg:h-7 [html[data-scrolled]_&]:lg:h-6" />
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
        <SiteNav
          items={items}
          logo={logo}
          account={
            <Suspense fallback={<AccountIcon />}>
              <AccountMenu />
            </Suspense>
          }
        />
      </Suspense>
    </header>
  );
}
