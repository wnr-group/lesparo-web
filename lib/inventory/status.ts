/** Stock wording shared by the shop and the admin. No server code here, so client components can import it. */
export type StockLevel = "untracked" | "in" | "low" | "out";
export type StockInfo = { level: StockLevel; /** Units on hand across all sizes (0 when untracked). */ total: number };

export const DEFAULT_LOW_STOCK = 5;

/**
 * The quantities that count: one per size the product currently offers (or the single no-size row). Stock left behind for a
 * size that was removed from the product is ignored, so it cannot make a sold-out product look in stock.
 */
export function liveQuantities(sizes: string[], rows: { size: string; quantity: number }[]): number[] {
  const offered = sizes.length ? new Set(sizes) : new Set([""]);
  return rows.filter((r) => offered.has(r.size)).map((r) => r.quantity);
}

export function stockInfo(track: boolean, threshold: number, quantities: number[]): StockInfo {
  if (!track) return { level: "untracked", total: 0 };
  const total = quantities.reduce((n, q) => n + Math.max(0, q), 0);
  if (total <= 0) return { level: "out", total: 0 };
  return { level: total <= threshold ? "low" : "in", total };
}

/** Text for the tag on product cards and pages, or null when nothing should be shown. */
export function stockLabel(info: StockInfo): string | null {
  if (info.level === "out") return "Out of stock";
  if (info.level === "low") return info.total === 1 ? "Only 1 left" : `Only ${info.total} left`;
  return null;
}
