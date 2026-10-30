/**
 * Puts DUMMY copy on every product that lacks it, so the product page and the catalogue have something to show before the
 * real text is written: a description, the specification rows (fit, care, material, colours) and the feature bullets.
 * Real text is edited in the admin panel (Admin > Products > Description and Specifications); this never overwrites a
 * description that is set, never replaces a specification row that exists, and only adds feature bullets to a product that
 * has none.
 *
 *   npm run descriptions:dummy
 */
import { db } from "./db";

type Kind = { noun: string; lines: string[] };

/** Dummy copy by category slug. A product's slug picks a stable line, so a re-run gives the same text. */
const KINDS: Record<string, Kind> = {
  shorts: { noun: "shorts", lines: ["Easy everyday shorts with a relaxed fit, made for home, travel and the gym.", "Lightweight shorts that stay comfortable through a long day, with a soft waistband and a clean finish."] },
  tracks: { noun: "track pants", lines: ["Track pants with an easy, comfortable fit for training, travel and relaxing at home.", "Everyday track pants cut for freedom of movement, with a soft waistband and a neat, durable finish."] },
  "3-4th": { noun: "three-quarter pants", lines: ["Three-quarter pants for warm days and active routines, light on the skin and easy to move in.", "A relaxed three-quarter length that sits between shorts and full-length pants, made for everyday comfort."] },
  lungi: { noun: "lungi", lines: ["A traditional lungi woven for everyday comfort, soft on the skin and easy to wash.", "A classic lungi with a clean, even weave, made to stay comfortable through long wear."] },
  "kavi-dhothy": { noun: "kavi dhothy", lines: ["A kavi dhothy with the traditional look and a soft, comfortable hand, made for daily wear and temple visits.", "A well-woven kavi dhothy that keeps its colour and drape wash after wash."] },
  towels: { noun: "towel", lines: ["A soft, absorbent towel for daily use, quick to dry and easy to care for.", "A dependable everyday towel with good absorbency and a gentle feel."] },
  kerchief: { noun: "kerchief", lines: ["A light, soft kerchief for everyday use, easy to carry and easy to wash.", "A practical everyday kerchief in a fine, comfortable weave."] },
};

type Details = { fit: string; care: string; material: string; features: string[] };

/** Dummy specification rows and feature bullets by category group, same keys as KINDS. */
const DETAILS: Record<string, Details> = {
  shorts: { fit: "Regular fit", care: "Machine wash cold with like colours. Do not bleach. Dry in shade.", material: "Soft cotton-rich knit", features: ["Elasticated waistband with drawcord", "Breathable, lightweight fabric", "Neat stitching built for everyday wear"] },
  tracks: { fit: "Comfort fit", care: "Machine wash cold with like colours. Do not bleach. Dry in shade.", material: "Soft cotton-rich knit", features: ["Elasticated waistband with drawcord", "Side pockets", "Easy-stretch fabric for freedom of movement", "Holds its shape wash after wash"] },
  "3-4th": { fit: "Relaxed fit", care: "Machine wash cold with like colours. Do not bleach. Dry in shade.", material: "Soft cotton-rich knit", features: ["Three-quarter length for warm days", "Elasticated waistband", "Light, breathable fabric"] },
  lungi: { fit: "Free size", care: "Hand wash or gentle machine wash. Wash dark colours separately. Dry in shade.", material: "Woven cotton", features: ["Even, durable weave", "Soft on the skin", "Colours stay fresh after washing"] },
  "kavi-dhothy": { fit: "Free size", care: "Hand wash or gentle machine wash. Wash separately. Dry in shade.", material: "Woven cotton", features: ["Traditional kavi finish", "Soft, comfortable hand", "Keeps its colour and drape"] },
  towels: { fit: "Standard size", care: "Machine wash warm. Wash with similar colours. Do not use fabric softener.", material: "Absorbent cotton terry", features: ["Soft and absorbent", "Quick to dry", "Hemmed edges for lasting use"] },
  kerchief: { fit: "Standard size", care: "Machine wash cold. Wash with similar colours. Dry in shade.", material: "Fine cotton weave", features: ["Light and soft", "Easy to carry", "Simple to wash and dry"] },
};
const DETAILS_FALLBACK: Details = { fit: "Standard fit", care: "Machine wash cold. Do not bleach. Dry in shade.", material: "Soft cotton-rich fabric", features: ["Comfortable everyday wear", "Made with care in Erode"] };

const FALLBACK: Kind = { noun: "garment", lines: ["A comfortable everyday piece from the LESPARO range, made with care in Erode.", "Made with care in Erode for everyday comfort and lasting wear."] };

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** The group a category belongs to, by the last word(s) of its slug: gents-shorts, kids-tracks, checked-lungi ... */
function groupOf(slug: string | undefined) {
  return slug ? Object.keys(KINDS).find((k) => slug === k || slug.endsWith(`-${k}`)) : undefined;
}
const kindFor = (slug: string | undefined): Kind => KINDS[groupOf(slug) ?? ""] ?? FALLBACK;
const detailsFor = (slug: string | undefined): Details => DETAILS[groupOf(slug) ?? ""] ?? DETAILS_FALLBACK;

type Spec = { label: string; value: string };

async function main() {
  const products = await db.product.findMany({ select: { id: true, slug: true, fabric: true, packing: true, description: true, specs: true, category: { select: { slug: true } } } });
  let described = 0;
  let detailed = 0;
  for (const p of products) {
    const data: { description?: string; specs?: Spec[] } = {};

    if (!p.description?.trim()) {
      const kind = kindFor(p.category?.slug);
      const parts = [kind.lines[hash(p.slug) % kind.lines.length]];
      if (p.fabric) parts.push(`Made in ${p.fabric}.`);
      if (p.packing) parts.push(`Supplied as: ${p.packing}.`);
      parts.push("Bulk and showroom orders are available on enquiry.");
      data.description = parts.join(" ");
      described++;
    }

    const specs = (Array.isArray(p.specs) ? p.specs : []) as Spec[];
    const d = detailsFor(p.category?.slug);
    const add: Spec[] = [
      { label: "Fit", value: d.fit },
      { label: "Care", value: d.care },
      { label: "Material composition", value: d.material },
      { label: "Colours", value: "Multiple colours available" },
    ].filter((row) => !specs.some((s) => s.label === row.label));
    if (!specs.some((s) => s.label === "Feature")) add.push(...d.features.map((value) => ({ label: "Feature", value })));
    if (add.length) {
      data.specs = [...specs, ...add];
      detailed++;
    }

    if (Object.keys(data).length) await db.product.update({ where: { id: p.id }, data });
  }
  console.log(`Set dummy descriptions on ${described} product(s) and dummy specifications/features on ${detailed}.`);
}

main().finally(() => db.$disconnect());
