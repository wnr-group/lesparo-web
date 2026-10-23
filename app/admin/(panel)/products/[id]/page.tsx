import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionButton } from "@/components/admin/forms";
import { ImageManager, ProductEditor } from "@/components/admin/product-editor";
import { formatDate, PageHeader, Panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/primitives";
import { getStaffSession } from "@/lib/auth/staff";
import { jsonStrings } from "@/lib/catalogue/queries";
import { requestDb } from "@/lib/db";
import { publicMediaUrl } from "@/lib/storage";
import { saveProduct, setArchived, updateImage, uploadImages } from "../actions";
import { categoryOptions } from "../shared";

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await requestDb();
  const [p, session, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { display_order: "asc" } } } }),
    getStaffSession(),
    categoryOptions(),
  ]);
  if (!p) notFound();
  const readOnly = !session?.isAdmin;
  const images = p.images;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={p.name}
        description={<>Last updated {formatDate(p.updated_at, true)}{p.legacy_id ? ` · imported from lesparo.com (#${p.legacy_id})` : ""}</>}
        actions={
          <>
            {p.archived_at ? <Badge>Archived</Badge> : p.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}
            {p.is_published && !p.archived_at && (
              <Link href={`/products/${p.slug}`} target="_blank" className={buttonClass("ghost", "sm")}>
                View on site ↗
              </Link>
            )}
            {!readOnly && (
              <ActionButton
                action={setArchived.bind(null, id, !p.archived_at)}
                confirmText={p.archived_at ? "Restore as draft?" : "Archive and unpublish?"}
                variant={p.archived_at ? "secondary" : "danger"}
              >
                {p.archived_at ? "Restore" : "Archive"}
              </ActionButton>
            )}
          </>
        }
      />
      {sp.created && <div className="mb-6"><Alert tone="success" title="Product created. Add images below, then publish when ready." /></div>}
      {readOnly && <div className="mb-6"><Alert tone="info" title="Read-only: only administrators can edit products." /></div>}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Details">
          <fieldset disabled={readOnly} className="contents">
            <ProductEditor
              action={saveProduct.bind(null, id)}
              categories={categories}
              isNew={false}
              product={{
                name: p.name,
                slug: p.slug,
                sku: p.sku,
                categoryId: p.category_id,
                description: p.description,
                fabric: p.fabric,
                sizes: jsonStrings(p.sizes),
                packing: p.packing,
                specs: p.specs as { label: string; value: string }[],
                quoteEnabled: p.quote_enabled,
                retailEnabled: p.retail_enabled,
                price: p.price,
                isPublished: p.is_published,
                isFeatured: p.is_featured,
                seoTitle: p.seo_title,
                seoDescription: p.seo_description,
              }}
            />
          </fieldset>
        </Panel>
        <Panel title={`Images (${images.length})`}>
          {readOnly ? (
            <p className="text-sm text-muted">Only administrators can manage images.</p>
          ) : (
            <ImageManager
              images={images.map((i) => ({ id: i.id, url: publicMediaUrl(i.storage_path)!, alt: i.alt_text, isPrimary: i.is_primary }))}
              uploadAction={uploadImages.bind(null, id)}
              updateAction={updateImage}
            />
          )}
        </Panel>
      </div>
    </>
  );
}
