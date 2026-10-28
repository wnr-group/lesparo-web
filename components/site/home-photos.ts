/** Studio photographs from the LESPARO shoot (public/collections, public/looks) used for the range tiles. Each image is used once on the homepage. */
export type PhotoTile = { name: string; href: string; src: string; pos: string };

/** The range grid: the large tile first. */
export const RANGE_TILES: PhotoTile[] = [
  { name: "Gents", href: "/collections/gents", src: "/collections/gents.jpg", pos: "50% 28%" },
  { name: "Track pants", href: "/collections/gents-tracks", src: "/collections/tracks.jpg", pos: "50% 75%" },
  { name: "Shorts", href: "/collections/gents-shorts", src: "/collections/shorts.jpg", pos: "50% 60%" },
  { name: "Tees", href: "/shop", src: "/looks/tee-knee.jpg", pos: "50% 30%" },
];

/** The round shortcuts above it. */
export const CIRCLE_TILES: PhotoTile[] = [
  { name: "Track pants", href: "/collections/gents-tracks", src: "/looks/c1.jpg", pos: "50% 70%" },
  { name: "Cargo wear", href: "/collections/gents-tracks", src: "/looks/c4.jpg", pos: "50% 55%" },
  { name: "Training pants", href: "/collections/gents-tracks", src: "/looks/c2.jpg", pos: "50% 60%" },
  { name: "Everyday tees", href: "/shop", src: "/looks/c5.jpg", pos: "50% 30%" },
  { name: "Training tees", href: "/shop", src: "/collections/kids.jpg", pos: "50% 25%" },
];
