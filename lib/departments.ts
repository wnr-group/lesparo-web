/**
 * Shopper departments and their wayfinding colours. Each department has a `.dept-*` class in app/globals.css that sets
 * `--dept` to its colour token, and components read it with var(--dept, <fallback>), so anything without a department
 * keeps the brand colours. Category slugs carry their parent's name (gents-shorts, kids-tracks, fabric-unstitched),
 * so a substring match is enough. Garments as a whole has no department: it holds both gents and kids.
 */
export type Department = "gents" | "kids" | "fabrics";

const MATCH: [Department, string[]][] = [
  ["kids", ["kids"]],
  ["gents", ["gents"]],
  ["fabrics", ["fabric", "lungi", "kavi", "towel", "kerchief"]],
];

export function departmentOf(slug?: string | null): Department | null {
  if (!slug) return null;
  return MATCH.find(([, words]) => words.some((w) => slug.includes(w)))?.[0] ?? null;
}

/** The `.dept-*` class for a slug's department, or undefined. */
export function deptClass(slug?: string | null): string | undefined {
  const d = departmentOf(slug);
  return d ? `dept-${d}` : undefined;
}
