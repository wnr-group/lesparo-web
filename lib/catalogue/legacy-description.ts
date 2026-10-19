/**
 * Turns the bulleted PrestaShop description format used on lesparo.com into structured
 * fields. Values are kept verbatim; only the label spelling is normalised
 * (e.g. "MATERIA COMPOSSITION" -> "Material composition").
 *
 *   * CARE INSTRUCTION: Use Normal Wash ...  * FIT TYPE: Regular type  * AVAILABLE SIZE = M, L,XL,2XL
 */

export type Spec = { label: string; value: string };

export type ParsedDescription = {
  specs: Spec[];
  features: string[];
  sizes: string[];
  packing: string | null;
  text: string;
};

const LABELS: Record<string, string> = {
  "CARE INSTRUCTION": "Care",
  "FIT TYPE": "Fit",
  "MATERIA COMPOSSITION": "Material composition",
  "MATERIAL COMPOSITION": "Material composition",
  "FABRIC TYPE": "Fabric type",
  "AVAILABLE COLORS": "Colours",
  "AVAILABLE COLOURS": "Colours",
  PACKING: "Packing",
  SIZE: "Sizes",
  SIZES: "Sizes",
  "AVAILABLE SIZE": "Sizes",
  "AVAILABLE SIZES": "Sizes",
};

const ENTITIES: Record<string, string> = { "&amp;": "&", "&nbsp;": " ", "&#039;": "'", "&#39;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">" };

export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[#a-z0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseSizes(raw: string): string[] {
  return raw
    .split(/[,/]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function parseLegacyDescription(html: string): ParsedDescription {
  const text = htmlToText(html);
  const specs: Spec[] = [];
  const features: string[] = [];
  let sizes: string[] = [];
  let packing: string | null = null;

  const bullets = text
    .split("*")
    .map((s) => s.replace(/\s+/g, " ").trim().replace(/[,;]+$/, "").trim())
    .filter(Boolean);

  for (const bullet of bullets) {
    const m = bullet.match(/^([A-Za-z][A-Za-z ]+?)\s*[:=]\s*(.+)$/);
    const label = m ? LABELS[m[1].trim().toUpperCase()] : undefined;
    if (!m || !label) {
      features.push(capitalise(bullet));
      continue;
    }
    const value = m[2].trim();
    if (label === "Sizes") {
      sizes = parseSizes(value);
      continue;
    }
    if (label === "Packing") packing = value;
    specs.push({ label, value });
  }

  return { specs, features, sizes, packing, text };
}
