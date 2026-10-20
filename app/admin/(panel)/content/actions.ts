"use server";

import { randomUUID } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { AuthorizationError, requireAdmin } from "@/lib/auth/staff";
import { CONTENT_TAG } from "@/lib/catalogue/queries";
import { fieldErrors } from "@/lib/services/enquiry-form";
import { sniffFileType } from "@/lib/services/file-sniff";
import { createClient } from "@/lib/supabase/server";
import { homepageSchema } from "@/lib/validation/content";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const s = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? String(fd.get(k)) : "");
const list = (v: string) =>
  v
    .split(/[\s,]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

export async function saveHomepage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdmin();
    const db = await createClient();
    const { data: current } = await db.from("site_content").select("data").eq("key", "homepage").maybeSingle();
    let imagePath: string | null = (current?.data as { hero?: { imagePath?: string | null } } | null)?.hero?.imagePath ?? null;

    if (fd.get("removeHeroImage") === "on") imagePath = null;
    const file = fd.get("heroImage");
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) return { error: "Hero image must be under 10 MB.", fields: { "hero.imagePath": "Too large." } };
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = sniffFileType(bytes);
      if (!type || type.mime === "application/pdf") return { error: "Hero image must be JPG, PNG or WebP.", fields: { "hero.imagePath": "Unsupported file." } };
      imagePath = `site/hero/${randomUUID()}.${type.ext}`;
      const up = await db.storage.from("product-media").upload(imagePath, bytes, { contentType: type.mime });
      if (up.error) throw up.error;
    }

    const candidate = {
      hero: {
        eyebrow: s(fd, "hero.eyebrow"),
        heading: s(fd, "hero.heading"),
        subheading: s(fd, "hero.subheading"),
        primaryCta: { label: s(fd, "hero.primaryCta.label"), href: s(fd, "hero.primaryCta.href") },
        secondaryCta: { label: s(fd, "hero.secondaryCta.label"), href: s(fd, "hero.secondaryCta.href") },
        imagePath,
      },
      featuredCategorySlugs: fd.getAll("featuredCategorySlugs").map(String),
      featuredProductSlugs: list(s(fd, "featuredProductSlugs")),
      story: { approved: fd.get("story.approved") === "on", heading: s(fd, "story.heading"), body: s(fd, "story.body") },
      sections: {
        categories: fd.get("sections.categories") === "on",
        products: fd.get("sections.products") === "on",
        story: fd.get("sections.story") === "on",
        fabrics: fd.get("sections.fabrics") === "on",
        wholesale: fd.get("sections.wholesale") === "on",
      },
    };
    const parsed = homepageSchema.safeParse(candidate);
    if (!parsed.success) return { error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };

    const slugs = parsed.data.featuredProductSlugs;
    if (slugs.length) {
      const { data: found } = await db.from("products").select("slug").in("slug", slugs).eq("is_published", true).is("archived_at", null);
      const missing = slugs.filter((x) => !found?.some((f) => f.slug === x));
      if (missing.length) return { error: "Some featured products are unknown or unpublished.", fields: { featuredProductSlugs: `Not found or unpublished: ${missing.join(", ")}` } };
    }

    const { error } = await db.from("site_content").upsert({ key: "homepage", data: parsed.data, updated_by: session.userId });
    if (error) throw error;
    updateTag(CONTENT_TAG);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error("[admin/content]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
