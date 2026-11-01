"use client";

import { ArrowDown, ArrowUp, Plus, Star, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { slugify } from "@/lib/validation/catalogue";
import { setDraft, type Draft } from "./card-preview";
import { FilePicker } from "./file-picker";
import { ActionButton, ActionForm, FieldError } from "./forms";

type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };
type Spec = { label: string; value: string };

export type EditableProduct = {
  name: string;
  slug: string;
  sku: string | null;
  categoryId: string | null;
  description: string | null;
  fabric: string | null;
  sizes: string[];
  packing: string | null;
  specs: Spec[];
  quoteEnabled: boolean;
  retailEnabled: boolean;
  price: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

const EMPTY: EditableProduct = {
  name: "",
  slug: "",
  sku: null,
  categoryId: null,
  description: null,
  fabric: null,
  sizes: [],
  packing: null,
  specs: [],
  quoteEnabled: true,
  retailEnabled: false,
  price: null,
  isPublished: false,
  isFeatured: false,
  seoTitle: null,
  seoDescription: null,
};

/** Reads the card-relevant fields straight from the form, so uncontrolled inputs are covered too. */
function readDraft(form: HTMLFormElement): Draft {
  const fd = new FormData(form);
  const text = (k: string) => String(fd.get(k) ?? "");
  return { name: text("name"), fabric: text("fabric"), description: text("description"), categoryId: text("categoryId"), price: text("price"), quoteEnabled: fd.get("quoteEnabled") === "on", retailEnabled: fd.get("retailEnabled") === "on" };
}

function L({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs text-muted">
      {children}
      {hint && <span className="ml-1 text-muted/80">— {hint}</span>}
    </label>
  );
}

export function ProductEditor({
  action,
  product,
  categories,
  isNew,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  product: EditableProduct | null;
  categories: { id: string; label: string }[];
  isNew: boolean;
}) {
  const p = product ?? EMPTY;
  const [name, setName] = useState(p.name);
  const [slug, setSlug] = useState(p.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [specs, setSpecs] = useState<Spec[]>(p.specs);
  const [retail, setRetail] = useState(p.retailEnabled);
  const wrap = useRef<HTMLDivElement>(null);

  // Feed the card preview: once on mount, then on every change below; cleared when the editor goes away.
  useEffect(() => {
    const form = wrap.current?.closest("form");
    if (form) setDraft(readDraft(form));
    return () => setDraft(null);
  }, []);

  return (
    <ActionForm action={action} submitLabel={isNew ? "Create product" : "Save product"} className="space-y-8">
      <div
        ref={wrap}
        className="space-y-8"
        onChange={(e) => {
          const form = (e.target as HTMLElement).closest("form");
          if (form) setDraft(readDraft(form));
        }}
      >
      <input type="hidden" name="specs" value={JSON.stringify(specs.filter((s) => s.label.trim() && s.value.trim()))} />
      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <L htmlFor="name">Name</L>
          <input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="field h-10 py-0"
          />
          <FieldError name="name" />
        </div>
        <div>
          <L htmlFor="slug" hint="used in the URL">
            Slug
          </L>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="field h-10 py-0 font-mono text-sm"
          />
          <FieldError name="slug" />
        </div>
        <div>
          <L htmlFor="categoryId">Category</L>
          <select id="categoryId" name="categoryId" defaultValue={p.categoryId ?? ""} className="field h-10 py-0">
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError name="categoryId" />
        </div>
        <div>
          <L htmlFor="sku">SKU / reference</L>
          <input id="sku" name="sku" defaultValue={p.sku ?? ""} className="field h-10 py-0" />
          <FieldError name="sku" />
        </div>
        <div className="md:col-span-2">
          <L htmlFor="description">Description</L>
          <textarea id="description" name="description" rows={4} defaultValue={p.description ?? ""} className="field" />
        </div>
        <div>
          <L htmlFor="fabric">Fabric</L>
          <input id="fabric" name="fabric" defaultValue={p.fabric ?? ""} className="field h-10 py-0" />
        </div>
        <div>
          <L htmlFor="sizes" hint="comma-separated">
            Sizes
          </L>
          <input id="sizes" name="sizes" defaultValue={p.sizes.join(", ")} placeholder="M, L, XL, 2XL" className="field h-10 py-0" />
        </div>
        <div className="md:col-span-2">
          <L htmlFor="packing">Packing</L>
          <input id="packing" name="packing" defaultValue={p.packing ?? ""} placeholder="Set of six pcs" className="field h-10 py-0" />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">Specifications</h3>
        <p className="mb-3 text-xs text-muted">Shown on the product page in this order. Use label “Feature” for bullet points.</p>
        <ul className="space-y-2">
          {specs.map((s, i) => (
            <li key={i} className="grid grid-cols-[10rem_1fr_auto] gap-2">
              <input aria-label={`Specification ${i + 1} label`} value={s.label} onChange={(e) => setSpecs((ss) => ss.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="field h-9 py-0 text-sm" />
              <input aria-label={`Specification ${i + 1} value`} value={s.value} onChange={(e) => setSpecs((ss) => ss.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="field h-9 py-0 text-sm" />
              <button type="button" onClick={() => setSpecs((ss) => ss.filter((_, j) => j !== i))} className="px-2 text-muted hover:text-danger" aria-label={`Remove specification ${i + 1}`}>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setSpecs((ss) => [...ss, { label: "", value: "" }])} className="mt-3 inline-flex items-center gap-1 text-sm text-indigo hover:underline">
          <Plus className="size-4" aria-hidden /> Add specification
        </button>
        <FieldError name="specs" />
      </section>

      {isNew && (
        <section>
          <h3 className="mb-2 text-sm font-medium">Images</h3>
          <p className="mb-3 text-xs text-muted">JPG, PNG or WebP, up to 10 MB each, up to 12. The first is the main image; you can reorder or change them after saving.</p>
          <FilePicker id="new-images" name="images" multiple accept="image/jpeg,image/png,image/webp" label="Choose images" />
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <fieldset className="space-y-2 border border-line p-4">
          <legend className="px-1 text-sm font-medium">Ordering</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="quoteEnabled" defaultChecked={p.quoteEnabled} className="accent-indigo" /> Wholesale (B2B): show Enquire now
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="retailEnabled" checked={retail} onChange={(e) => setRetail(e.target.checked)} className="accent-indigo" /> Retail (B2C): show price, Add to cart and Buy now
          </label>
          <FieldError name="quoteEnabled" />
          {retail && (
            <div className="pt-2">
              <L htmlFor="price">Price (INR)</L>
              <input id="price" name="price" inputMode="decimal" defaultValue={p.price ?? ""} className="field h-10 py-0" />
              <FieldError name="price" />
              <p className="mt-1 text-xs text-muted">Retail price per piece. You can also edit prices for many products at once under Pricing.</p>
            </div>
          )}
        </fieldset>
        <fieldset className="space-y-2 border border-line p-4">
          <legend className="px-1 text-sm font-medium">Visibility</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={p.isPublished} className="accent-indigo" /> Published on the website
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={p.isFeatured} className="accent-indigo" /> Featured (sorted first)
          </label>
        </fieldset>
      </section>

      <details className="border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium">Search engine settings</summary>
        <div className="mt-4 grid gap-4">
          <div>
            <L htmlFor="seoTitle" hint="max 70 characters">
              SEO title
            </L>
            <input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={p.seoTitle ?? ""} className="field h-10 py-0" />
          </div>
          <div>
            <L htmlFor="seoDescription" hint="max 170 characters">
              SEO description
            </L>
            <textarea id="seoDescription" name="seoDescription" maxLength={170} rows={2} defaultValue={p.seoDescription ?? ""} className="field" />
          </div>
        </div>
      </details>
      </div>
    </ActionForm>
  );
}

export type ManagedImage = { id: string; url: string; alt: string; isPrimary: boolean };

export function ImageManager({
  images,
  uploadAction,
  updateAction,
}: {
  images: ManagedImage[];
  uploadAction: (state: ActionState, fd: FormData) => Promise<ActionState>;
  updateAction: (id: string, change: { alt?: string; move?: -1 | 1; primary?: true; remove?: true }) => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (id: string, change: Parameters<typeof updateAction>[1]) =>
    start(async () => {
      const r = await updateAction(id, change);
      setError(r.error ?? null);
    });

  return (
    <div aria-busy={pending}>
      {images.length ? (
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="border border-line bg-ivory p-2">
              <div className="relative aspect-[513/655] bg-plate">
                <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-contain" />
                {img.isPrimary && <span className="absolute left-1 top-1 bg-indigo px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wider text-paper">Primary</span>}
              </div>
              <label className="sr-only" htmlFor={`alt-${img.id}`}>
                Alt text
              </label>
              <input
                id={`alt-${img.id}`}
                defaultValue={img.alt}
                placeholder="Describe the image"
                onBlur={(e) => e.target.value !== img.alt && run(img.id, { alt: e.target.value })}
                className="field mt-2 h-8 py-0 text-xs"
              />
              <div className="mt-2 flex items-center justify-between text-muted">
                <span className="flex gap-1">
                  <button type="button" disabled={i === 0} onClick={() => run(img.id, { move: -1 })} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move earlier">
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button type="button" disabled={i === images.length - 1} onClick={() => run(img.id, { move: 1 })} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move later">
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  {!img.isPrimary && (
                    <button type="button" onClick={() => run(img.id, { primary: true })} className="p-1 hover:text-brass" aria-label="Make primary image">
                      <Star className="size-4" aria-hidden />
                    </button>
                  )}
                </span>
                <ActionButton action={() => updateAction(img.id, { remove: true })} confirmText="Delete?" variant="ghost">
                  <Trash2 className="size-4" aria-label="Delete image" />
                </ActionButton>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">No images yet. The product shows “Image coming soon” until one is added.</p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-6 border-t border-line pt-4">
        <ActionForm action={uploadAction} submitLabel="Upload" successMessage="Uploaded." resetOnSuccess>
          <p className="mb-2 text-xs text-muted">Add images (JPG, PNG or WebP, up to 10 MB each)</p>
          <FilePicker id="images" name="images" multiple accept="image/jpeg,image/png,image/webp" label="Choose images" />
        </ActionForm>
      </div>
    </div>
  );
}
