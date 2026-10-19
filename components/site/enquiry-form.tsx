"use client";

import clsx from "clsx";
import { CheckCircle2, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import type { EnquiryFormState } from "@/app/(site)/wholesale/actions";
import { ATTACHMENT_RULES } from "@/lib/validation/enquiry";
import { readEnquiryList, useEnquiryList } from "./enquiry-list";

type ProductOption = { id: string; name: string; slug: string; category: string | null };
type Line = { key: string; productId: string; productName: string; quantity: string; specifications: string };

const newLine = (productId = ""): Line => ({ key: crypto.randomUUID(), productId, productName: "", quantity: "", specifications: "" });

function Field({ id, label, error, hint, required, children }: { id: string; label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <span className="text-danger"> *</span> : <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function EnquiryForm({
  action,
  products,
  preselectSlug,
}: {
  action: (state: EnquiryFormState, fd: FormData) => Promise<EnquiryFormState>;
  products: ProductOption[];
  preselectSlug?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as EnquiryFormState);
  const list = useEnquiryList();
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const seeded = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const grouped = useMemo(() => {
    const map = new Map<string, ProductOption[]>();
    for (const p of products) map.set(p.category ?? "Other", [...(map.get(p.category ?? "Other") ?? []), p]);
    return [...map.entries()];
  }, [products]);

  // Seed lines once on the client: from ?product=, then the browser's enquiry list.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    setIdempotencyKey(crypto.randomUUID());
    const ids = new Set<string>();
    const fromParam = products.find((p) => p.slug === preselectSlug);
    if (fromParam) ids.add(fromParam.id);
    // Read storage directly: on the first (hydrating) render the store still reports the server snapshot.
    for (const item of readEnquiryList()) if (products.some((p) => p.id === item.id)) ids.add(item.id);
    setLines(ids.size ? [...ids].map((id) => newLine(id)) : [newLine()]);
  }, [preselectSlug, products]);

  useEffect(() => {
    // The success view replaces the form; "Send another" reloads for a fresh idempotency key.
    if (state.status === "success") list.clear();
    if (state.status !== "idle") statusRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (k: string) => (state.status === "error" ? state.fields[k] : undefined);
  const values = state.status === "error" ? state.values : {};
  const aria = (id: string, k: string) => ({ id, name: k, defaultValue: values[k], "aria-invalid": !!err(k) || undefined, "aria-describedby": err(k) ? `${id}-error` : undefined });
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="border border-success/30 bg-paper p-8 outline-none sm:p-12">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h3 className="mt-5 font-display font-semibold text-title">Thank you — your enquiry has been received.</h3>
        {state.enquiryNumber !== "—" && (
          <p className="mt-3 text-ink-soft">
            Your reference is <strong className="font-medium text-ink tabular-nums">{state.enquiryNumber}</strong>. Please quote it if you contact us. Our sales team will review your requirement and get back to you.
          </p>
        )}
        {state.warning && <p className="mt-4 text-sm text-warning">{state.warning}</p>}
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/shop" className="link-draw font-medium">
            Continue browsing →
          </Link>
          <button type="button" className="link-draw text-muted" onClick={() => window.location.reload()}>
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form key={state.status === "error" ? JSON.stringify(state.values) + state.message : "fresh"} action={formAction} noValidate className="space-y-10" aria-describedby={state.status === "error" ? `${uid}-status` : undefined}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div ref={statusRef} tabIndex={-1} id={`${uid}-status`} className="outline-none">
        {state.status === "error" && (
          <p role="alert" className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        )}
      </div>

      <fieldset className="space-y-5">
        <legend className="eyebrow mb-5">1 · What you need</legend>
        {err("items") && <p className="text-sm text-danger">{err("items")}</p>}
        <ol className="space-y-4">
          {lines.map((line, i) => (
            <li key={line.key} className="border border-line bg-paper p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Line {i + 1}</p>
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))} className="flex items-center gap-1 text-xs text-muted hover:text-danger">
                    <Trash2 className="size-3.5" aria-hidden /> Remove
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[1.6fr_0.8fr]">
                <Field id={`${uid}-p${i}`} label="Product" required error={err(`items.${i}.productName`)}>
                  <select
                    id={`${uid}-p${i}`}
                    name={`items.${i}.productId`}
                    value={line.productId}
                    onChange={(e) => update(line.key, { productId: e.target.value })}
                    className="field"
                    aria-invalid={!!err(`items.${i}.productName`) || undefined}
                  >
                    <option value="">Custom requirement (describe below)</option>
                    {grouped.map(([cat, ps]) => (
                      <optgroup key={cat} label={cat}>
                        {ps.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field id={`${uid}-q${i}`} label="Quantity (pieces)" error={err(`items.${i}.quantity`)}>
                  <input
                    id={`${uid}-q${i}`}
                    name={`items.${i}.quantity`}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: e.target.value })}
                    className="field"
                    aria-invalid={!!err(`items.${i}.quantity`) || undefined}
                  />
                </Field>
              </div>
              {!line.productId && (
                <div className="mt-4">
                  <Field id={`${uid}-n${i}`} label="What product do you need?" required>
                    <input id={`${uid}-n${i}`} name={`items.${i}.productName`} value={line.productName} onChange={(e) => update(line.key, { productName: e.target.value })} className="field" placeholder="e.g. cotton towels, 30 × 60 in" />
                  </Field>
                </div>
              )}
              <div className="mt-4">
                <Field id={`${uid}-s${i}`} label="Sizes, colours, fabric or other specifications">
                  <input id={`${uid}-s${i}`} name={`items.${i}.specifications`} value={line.specifications} onChange={(e) => update(line.key, { specifications: e.target.value })} className="field" />
                </Field>
              </div>
            </li>
          ))}
        </ol>
        {lines.length < 20 && (
          <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])} className="inline-flex items-center gap-2 text-sm font-medium text-indigo hover:underline">
            <Plus className="size-4" aria-hidden /> Add another product
          </button>
        )}
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 sm:col-span-2">2 · About you</legend>
        <Field id={`${uid}-name`} label="Your name" required error={err("customerName")}>
          <input {...aria(`${uid}-name`, "customerName")} autoComplete="name" className="field" />
        </Field>
        <Field id={`${uid}-company`} label="Company" error={err("companyName")}>
          <input {...aria(`${uid}-company`, "companyName")} autoComplete="organization" className="field" />
        </Field>
        <Field id={`${uid}-email`} label="Business email" required error={err("email")}>
          <input {...aria(`${uid}-email`, "email")} type="email" autoComplete="email" className="field" />
        </Field>
        <Field id={`${uid}-phone`} label="Phone with country code" required error={err("phone")} hint="e.g. +91 94430 22044">
          <input {...aria(`${uid}-phone`, "phone")} type="tel" autoComplete="tel" className="field" />
        </Field>
        <Field id={`${uid}-country`} label="Country / market" error={err("country")}>
          <input {...aria(`${uid}-country`, "country")} autoComplete="country-name" className="field" placeholder="India" />
        </Field>
        <Field id={`${uid}-budget`} label="Target price or budget" error={err("targetBudget")}>
          <input {...aria(`${uid}-budget`, "targetBudget")} className="field" />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="eyebrow mb-5">3 · Details</legend>
        <Field id={`${uid}-msg`} label="Your requirement" required error={err("message")} hint="Delivery location, timelines, packing or branding needs — anything that helps us quote accurately.">
          <textarea {...aria(`${uid}-msg`, "message")} rows={5} className="field" />
        </Field>
        <Field id={`${uid}-files`} label={`Reference files (up to ${ATTACHMENT_RULES.maxFiles}, 8 MB each)`} error={err("attachments")} hint="JPG, PNG, WebP or PDF. Files are stored privately.">
          <label
            htmlFor={`${uid}-files`}
            className={clsx("flex cursor-pointer items-center gap-3 border border-dashed border-sand bg-paper px-4 py-4 text-sm hover:border-ink", err("attachments") && "border-danger")}
          >
            <Paperclip className="size-4 text-muted" aria-hidden />
            <span className="truncate">{fileNames.length ? fileNames.join(", ") : "Choose files"}</span>
          </label>
          <input
            id={`${uid}-files`}
            name="attachments"
            type="file"
            multiple
            accept={ATTACHMENT_RULES.accept}
            className="sr-only"
            aria-describedby={err("attachments") ? `${uid}-files-error` : `${uid}-files-hint`}
            onChange={(e) => setFileNames([...(e.target.files ?? [])].map((f) => f.name))}
          />
        </Field>
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" defaultChecked={values.consent === "on"} className="mt-0.5 size-4 accent-indigo" aria-invalid={!!err("consent") || undefined} aria-describedby={err("consent") ? `${uid}-consent-error` : undefined} />
            <span>
              LESPARO may store these details and contact me about this enquiry. See our{" "}
              <Link href="/policies/privacy" className="underline">
                privacy notice
              </Link>
              .
            </span>
          </label>
          {err("consent") && (
            <p id={`${uid}-consent-error`} className="mt-1.5 text-xs text-danger">
              {err("consent")}
            </p>
          )}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending || !idempotencyKey}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-indigo px-8 text-[0.95rem] font-semibold text-white transition-colors hover:bg-indigo-deep disabled:opacity-60 sm:w-auto"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
