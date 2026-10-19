/**
 * Snapshots the current lesparo.com (PrestaShop) catalogue into data/live-catalogue.json.
 *
 * This is the source of truth for the initial import: only data present on the live
 * site is captured. Nothing is invented. Re-run whenever the live catalogue changes.
 *
 *   npm run catalogue:crawl
 */
import * as cheerio from "cheerio";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://lesparo.com";
const UA = "Mozilla/5.0 (LESPARO catalogue migration)";

type LiveCategory = {
  legacyId: number;
  name: string;
  legacyUrl: string;
  parentLegacyId: number | null;
  depth: number;
  productLegacyIds: number[];
};

type LiveProduct = {
  legacyId: number;
  name: string;
  slug: string;
  legacyUrl: string;
  reference: string;
  descriptionHtml: string;
  descriptionShortHtml: string;
  features: { name: string; value: string }[];
  images: { url: string; position: number; cover: boolean; legend: string }[];
  dateAdded: string;
  dateUpdated: string;
};

class NotFound extends Error {}

async function get(url: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.ok) return res.text();
    if (res.status === 404) throw new NotFound(url);
    if (attempt === 3) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw new Error("unreachable");
}

function legacyCategoryId(href: string): number | null {
  const m = href.match(/\/en\/(\d+)-/);
  return m ? Number(m[1]) : null;
}

function walkMenu($: cheerio.CheerioAPI, ul: cheerio.Cheerio<never>, parent: number | null, depth: number, out: LiveCategory[]) {
  ul.children("li").each((_, li) => {
    const a = $(li).children("a").first();
    const href = a.attr("href") ?? "";
    const id = legacyCategoryId(href);
    if (id === null) return; // e.g. /rfq
    out.push({ legacyId: id, name: a.text().trim(), legacyUrl: href, parentLegacyId: parent, depth, productLegacyIds: [] });
    const child = $(li).children("ul").first() as cheerio.Cheerio<never>;
    if (child.length) walkMenu($, child, id, depth + 1, out);
  });
}

async function main() {
  const home = cheerio.load(await get(`${BASE}/en/`));
  const categories: LiveCategory[] = [];
  walkMenu(home, home("ul.sf-menu").first() as cheerio.Cheerio<never>, null, 1, categories);

  // "Ladies" is linked from the footer but not the main menu.
  home('a[href*="/en/87-ladies"]').first().each((_, a) => {
    const href = home(a).attr("href")!;
    if (!categories.some((c) => c.legacyId === 87)) {
      categories.push({ legacyId: 87, name: home(a).text().trim() || "Ladies", legacyUrl: href, parentLegacyId: 86, depth: 2, productLegacyIds: [] });
    }
  });

  const productUrls = new Map<number, string>();
  const collect = ($: cheerio.CheerioAPI, into?: LiveCategory) =>
    $("[data-id-product]").each((_, el) => {
      const id = Number($(el).attr("data-id-product"));
      // Links to products with combinations carry a "#/27-number-26" fragment.
      const url = $(el).find("a[href*='.html']").first().attr("href")?.split("#")[0];
      if (!id || !url) return;
      into?.productLegacyIds.push(id);
      productUrls.set(id, url);
    });

  // Products featured on the homepage are not always listed under a category.
  collect(home);

  const deadCategories: LiveCategory[] = [];
  for (const cat of categories) {
    let html: string;
    try {
      html = await get(`${cat.legacyUrl}?resultsPerPage=500`);
    } catch (err) {
      if (!(err instanceof NotFound)) throw err;
      console.warn(`category ${cat.legacyId} ${cat.name}: 404 on live site, skipped`);
      deadCategories.push(cat);
      continue;
    }
    collect(cheerio.load(html), cat);
    cat.productLegacyIds = [...new Set(cat.productLegacyIds)];
    console.log(`category ${cat.legacyId} ${cat.name}: ${cat.productLegacyIds.length} products`);
  }

  const products: LiveProduct[] = [];
  for (const [id, url] of productUrls) {
    const $ = cheerio.load(await get(url));
    const raw = $("[data-product]").first().attr("data-product");
    if (!raw) {
      console.warn(`no data-product payload on ${url}`);
      continue;
    }
    const p = JSON.parse(raw);
    products.push({
      legacyId: id,
      name: String(p.name).trim(),
      slug: String(p.link_rewrite),
      legacyUrl: url,
      reference: String(p.reference ?? ""),
      descriptionHtml: String(p.description ?? ""),
      descriptionShortHtml: String(p.description_short ?? ""),
      features: (p.features ?? []).map((f: { name: string; value: string }) => ({ name: f.name, value: f.value })),
      images: (p.images ?? []).map((img: { large: { url: string }; position: string; cover: string | null; legend: string }) => ({
        url: img.large.url,
        position: Number(img.position),
        cover: img.cover === "1",
        legend: img.legend ?? "",
      })),
      dateAdded: p.date_add,
      dateUpdated: p.date_upd,
    });
    console.log(`product ${id} ${p.name}: ${p.images?.length ?? 0} images`);
  }

  const out = path.join(process.cwd(), "data", "live-catalogue.json");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(
      {
        source: `${BASE}/en/`,
        crawledAt: new Date().toISOString(),
        categories: categories.filter((c) => !deadCategories.includes(c)),
        deadCategories: deadCategories.map((c) => ({ legacyId: c.legacyId, name: c.name, legacyUrl: c.legacyUrl })),
        products,
      },
      null,
      2,
    ));
  console.log(`wrote ${categories.length} categories, ${products.length} products to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
