import { asset } from "@/lib/assets";
/** Studio photographs from the LESPARO shoot (public/collections, public/looks) used for the range tiles. Each image is used once on the homepage. */
export type PhotoTile = { name: string; href: string; src: string; pos: string };

/** The range grid: the large tile first. */
export const RANGE_TILES: PhotoTile[] = [
  { name: "Gents", href: "/collections/gents", src: asset("/collections/gents.jpg"), pos: "50% 28%" },
  { name: "Track pants", href: "/collections/gents-tracks", src: asset("/collections/tracks.jpg"), pos: "50% 75%" },
  { name: "Shorts", href: "/collections/gents-shorts", src: asset("/collections/shorts.jpg"), pos: "50% 60%" },
  { name: "Tees", href: "/shop", src: asset("/looks/tee-knee.jpg"), pos: "50% 30%" },
];

/**
 * The round shortcuts above it: one photograph per garment category, keyed by the category slug. The names and links come from the
 * catalogue (see app/(site)/page.tsx), so a category without an entry here simply has no circle. The images are 480px square crops in
 * public/range, cut from LESPARO studio and catalogue photographs (Women is the licensed stock photo in public/menu, see SOURCES.txt).
 */
export const CATEGORY_CIRCLES: Record<string, { src: string; pos: string }> = {
  gents: { src: asset("/range/gents.webp"), pos: "50% 50%" },
  kids: { src: asset("/range/kids.webp"), pos: "50% 50%" },
  boys: { src: asset("/range/boys.webp"), pos: "50% 50%" },
  women: { src: asset("/range/women.webp"), pos: "50% 50%" },
  hoodies: { src: asset("/range/hoodies.webp"), pos: "50% 50%" },
  "new-styles": { src: asset("/range/new-styles.webp"), pos: "50% 50%" },
};
