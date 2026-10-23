import Image from "next/image";
import Link from "next/link";
import { ActionForm, FieldError } from "@/components/admin/forms";
import { formatDate, PageHeader, Panel } from "@/components/admin/ui";
import { Alert } from "@/components/ui/primitives";
import { getStaffSession } from "@/lib/auth/staff";
import { requestDb } from "@/lib/db";
import { publicMediaUrl } from "@/lib/storage";
import { DEFAULT_HOMEPAGE, homepageSchema } from "@/lib/validation/content";
import { saveHomepage } from "./actions";

function Text({ name, label, value, max, area }: { name: string; label: string; value: string; max: number; area?: boolean }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      {area ? (
        <textarea id={name} name={name} defaultValue={value} maxLength={max} rows={4} className="field text-sm" />
      ) : (
        <input id={name} name={name} defaultValue={value} maxLength={max} className="field h-10 py-0 text-sm" />
      )}
      <FieldError name={name} />
    </div>
  );
}

export default async function ContentPage() {
  const session = await getStaffSession();
  if (!session?.isAdmin) return <Alert tone="warning" title="Administrator access is required to edit site content." />;
  const db = await requestDb();
  const [row, cats, products] = await Promise.all([
    db.siteContent.findUnique({ where: { key: "homepage" }, select: { data: true, updated_at: true } }),
    db.category.findMany({ where: { is_published: true }, select: { slug: true, name: true, parent_id: true }, orderBy: { display_order: "asc" } }),
    db.product.findMany({ where: { is_published: true, archived_at: null }, select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const parsed = homepageSchema.safeParse(row?.data);
  const c = parsed.success ? parsed.data : DEFAULT_HOMEPAGE;
  const heroUrl = publicMediaUrl(c.hero.imagePath);
  const subcats = cats.filter((x) => x.parent_id);

  return (
    <>
      <PageHeader
        title="Homepage"
        description={row ? `Last saved ${formatDate(row.updated_at, true)}` : "Using default content"}
        actions={
          <Link href="/" target="_blank" className="text-sm text-muted hover:text-ink">
            Preview homepage ↗
          </Link>
        }
      />
      <ActionForm action={saveHomepage} submitLabel="Save homepage" className="space-y-6">
        <Panel title="Hero">
          <div className="grid gap-4 md:grid-cols-2">
            <Text name="hero.eyebrow" label="Eyebrow" value={c.hero.eyebrow} max={80} />
            <Text name="hero.heading" label="Heading" value={c.hero.heading} max={120} />
            <div className="md:col-span-2">
              <Text name="hero.subheading" label="Supporting text" value={c.hero.subheading} max={300} area />
            </div>
            <Text name="hero.primaryCta.label" label="Primary button label" value={c.hero.primaryCta.label} max={40} />
            <Text name="hero.primaryCta.href" label="Primary button link (/path or https://)" value={c.hero.primaryCta.href} max={300} />
            <Text name="hero.secondaryCta.label" label="Secondary button label" value={c.hero.secondaryCta.label} max={40} />
            <Text name="hero.secondaryCta.href" label="Secondary button link" value={c.hero.secondaryCta.href} max={300} />
            <div className="md:col-span-2 flex flex-wrap items-end gap-6 border-t border-line pt-4">
              {heroUrl ? (
                <div className="relative aspect-[4/5] w-24 bg-plate ring-1 ring-line">
                  <Image src={heroUrl} alt="Current hero" fill sizes="96px" className="object-cover" />
                </div>
              ) : (
                <p className="max-w-sm text-xs text-muted">No hero photograph set: the hero shows layered images of the first featured products. Upload an approved editorial photograph to replace them.</p>
              )}
              <div>
                <label htmlFor="heroImage" className="mb-1 block text-xs text-muted">
                  Hero photograph (portrait, JPG/PNG/WebP)
                </label>
                <input id="heroImage" name="heroImage" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
                <FieldError name="hero.imagePath" />
              </div>
              {heroUrl && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="removeHeroImage" className="accent-indigo" /> Remove photograph
                </label>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Featured collections">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {subcats.map((cat) => (
              <label key={cat.slug} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="featuredCategorySlugs" value={cat.slug} defaultChecked={c.featuredCategorySlugs.includes(cat.slug)} className="accent-indigo" />
                {cat.name} <span className="text-xs text-muted">({cat.slug})</span>
              </label>
            ))}
          </div>
          <FieldError name="featuredCategorySlugs" />
        </Panel>

        <Panel title="Featured products">
          <label htmlFor="featuredProductSlugs" className="mb-1 block text-xs text-muted">
            Product slugs in display order, separated by commas (up to 12). The first two garments and first fabric item also form the hero.
          </label>
          <textarea id="featuredProductSlugs" name="featuredProductSlugs" rows={3} defaultValue={c.featuredProductSlugs.join(", ")} className="field font-mono text-xs" />
          <FieldError name="featuredProductSlugs" />
          <details className="mt-3 text-xs text-muted">
            <summary className="cursor-pointer">All published product slugs</summary>
            <p className="mt-2 font-mono leading-relaxed">{products.map((p) => p.slug).join(", ")}</p>
          </details>
        </Panel>

        <Panel title="Brand story">
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" name="story.approved" defaultChecked={c.story.approved} className="accent-indigo" /> Approved for publication (unapproved text is never shown publicly)
          </label>
          <div className="grid gap-4">
            <Text name="story.heading" label="Heading" value={c.story.heading} max={120} />
            <Text name="story.body" label="Body" value={c.story.body} max={2000} area />
          </div>
        </Panel>

        <Panel title="Sections">
          <div className="flex flex-wrap gap-6 text-sm">
            {(Object.keys(c.sections) as (keyof typeof c.sections)[]).map((k) => (
              <label key={k} className="flex items-center gap-2 capitalize">
                <input type="checkbox" name={`sections.${k}`} defaultChecked={c.sections[k]} className="accent-indigo" /> {k}
              </label>
            ))}
          </div>
        </Panel>
      </ActionForm>
    </>
  );
}
