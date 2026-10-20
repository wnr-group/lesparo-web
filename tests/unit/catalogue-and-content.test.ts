import { describe, expect, it } from "vitest";
import { parseLegacyDescription } from "@/lib/catalogue/legacy-description";
import { safeDisplayName, sniffFileType } from "@/lib/services/file-sniff";
import { productSchema, slugify } from "@/lib/validation/catalogue";
import { DEFAULT_HOMEPAGE, homepageSchema, linkSchema } from "@/lib/validation/content";

describe("legacy PrestaShop description parser", () => {
  it("extracts specs, sizes and packing, keeping values verbatim", () => {
    const html =
      "<p>* <strong>CARE INSTRUCTION:</strong> Use Normal Wash<br />* <strong>FIT TYPE:</strong> Regular type<br />* <strong>MATERIA COMPOSSITION:</strong> Hosiery loop knitting<br />* Waist Band Comfortable Rib Elastic &amp; drawstring<br />* <strong>PACKING</strong>: Set of six pc’s<br />* <strong>AVAILABLE SIZE</strong> =M, L,XL,2XL</p>";
    const r = parseLegacyDescription(html);
    expect(r.sizes).toEqual(["M", "L", "XL", "2XL"]);
    expect(r.packing).toBe("Set of six pc’s");
    expect(r.specs).toContainEqual({ label: "Material composition", value: "Hosiery loop knitting" });
    expect(r.features).toEqual(["Waist Band Comfortable Rib Elastic & drawstring"]);
  });

  it("matches labels case-insensitively (regression: 'Size =M, L')", () => {
    expect(parseLegacyDescription("* Size =M, L,XL,2XL").sizes).toEqual(["M", "L", "XL", "2XL"]);
  });

  it("returns empty structures for empty descriptions", () => {
    expect(parseLegacyDescription("<p> </p>")).toMatchObject({ specs: [], sizes: [], packing: null });
  });
});

describe("upload sniffing", () => {
  it("identifies files by content, not by name", () => {
    expect(sniffFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(sniffFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))?.ext).toBe("pdf");
    expect(sniffFileType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffFileType(new TextEncoder().encode("MZ\x90\x00 fake.jpg"))).toBeNull();
  });

  it("strips paths from display names", () => {
    expect(safeDisplayName("..\\..\\windows\\evil<x>.pdf")).toBe("evil_x_.pdf");
  });
});

describe("catalogue validation", () => {
  it("slugifies names consistently", () => {
    expect(slugify("Loom Don 3/4th Without Rib")).toBe("loom-don-3-4th-without-rib");
    expect(slugify("  Handkerchief  160 ")).toBe("handkerchief-160");
  });

  it("requires a price before retail can be enabled, and at least one ordering route", () => {
    const base = { name: "Test", slug: "test", categoryId: "", quoteEnabled: "on" };
    expect(productSchema.safeParse({ ...base, retailEnabled: "on" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, retailEnabled: "on", price: "499" }).success).toBe(true);
    expect(productSchema.safeParse({ name: "Test", slug: "test", categoryId: "" }).success).toBe(false);
  });
});

describe("homepage content", () => {
  it("accepts the default (verified) content", () => {
    expect(homepageSchema.safeParse(DEFAULT_HOMEPAGE).success).toBe(true);
  });

  it("only allows site paths or https links in CTAs", () => {
    expect(linkSchema.safeParse("/wholesale#enquire").success).toBe(true);
    expect(linkSchema.safeParse("https://wa.me/919443022044").success).toBe(true);
    for (const bad of ["javascript:alert(1)", "//evil.example", "http://insecure.example", "data:text/html,x"]) expect(linkSchema.safeParse(bad).success).toBe(false);
  });
});
