"use client";

import Image from "next/image";
import { useState } from "react";
import { slugify } from "@/lib/validation/catalogue";
import { ActionForm, FieldError } from "./forms";

type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

export type EditableCategory = {
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  displayOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  coverUrl: string | null;
};

export function CategoryEditor({
  action,
  category,
  parents,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  category: EditableCategory | null;
  parents: { id: string; label: string }[];
}) {
  const c = category ?? { name: "", slug: "", parentId: null, description: null, displayOrder: 0, isPublished: false, isFeatured: false, coverUrl: null };
  const [slug, setSlug] = useState(c.slug);
  const [touched, setTouched] = useState(!!category);

  return (
    <ActionForm action={action} submitLabel={category ? "Save category" : "Create category"} className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="name" className="mb-1 block text-xs text-muted">
          Name
        </label>
        <input id="name" name="name" defaultValue={c.name} onChange={(e) => !touched && setSlug(slugify(e.target.value))} className="field h-10 py-0" />
        <FieldError name="name" />
      </div>
      <div>
        <label htmlFor="slug" className="mb-1 block text-xs text-muted">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setTouched(true);
            setSlug(e.target.value);
          }}
          className="field h-10 py-0 font-mono text-sm"
        />
        <FieldError name="slug" />
      </div>
      <div>
        <label htmlFor="parentId" className="mb-1 block text-xs text-muted">
          Parent
        </label>
        <select id="parentId" name="parentId" defaultValue={c.parentId ?? ""} className="field h-10 py-0">
          <option value="">— Top level —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <FieldError name="parentId" />
      </div>
      <div>
        <label htmlFor="displayOrder" className="mb-1 block text-xs text-muted">
          Display order (lower first)
        </label>
        <input id="displayOrder" name="displayOrder" type="number" min={0} defaultValue={c.displayOrder} className="field h-10 py-0" />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="description" className="mb-1 block text-xs text-muted">
          Description
        </label>
        <textarea id="description" name="description" rows={3} defaultValue={c.description ?? ""} className="field" />
      </div>
      <div className="md:col-span-2 flex flex-wrap items-end gap-6">
        {c.coverUrl && (
          <div className="relative aspect-[4/5] w-20 bg-plate ring-1 ring-line">
            <Image src={c.coverUrl} alt="Current cover" fill sizes="80px" className="object-contain" />
          </div>
        )}
        <div>
          <label htmlFor="cover" className="mb-1 block text-xs text-muted">
            {c.coverUrl ? "Replace cover image" : "Cover image"}
          </label>
          <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
          <FieldError name="cover" />
        </div>
      </div>
      <div className="md:col-span-2 flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isPublished" defaultChecked={c.isPublished} className="accent-indigo" /> Published
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked={c.isFeatured} className="accent-indigo" /> Featured on homepage
        </label>
      </div>
    </ActionForm>
  );
}
