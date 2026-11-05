/** Navigation model, built from the live catalogue in components/site/header.tsx and rendered by the desktop mega menu and the mobile drawer. */
export type NavLink = { label: string; href: string };
export type NavTile = { label: string; href: string; image: string; pos?: string };
export type NavColumn = { title: string; links: NavLink[] };
export type NavPanel = {
  /** Heading and one line of supporting copy at the left of the panel. */
  heading: string;
  blurb: string;
  columns: NavColumn[];
  tiles: NavTile[];
  /** How the photographs are cut: tall tiles for menswear, one wide tile for women, squares for kids. */
  shape: "portrait" | "landscape" | "square";
  cta: NavLink;
};
export type NavItem = { key: string; label: string; href: string; panel?: NavPanel };
