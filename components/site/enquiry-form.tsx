"use client";

import clsx from "clsx";
import { ArrowRight, Check, CheckCircle2, Loader2, Lock, Paperclip, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import type { EnquiryFormState } from "@/app/(site)/wholesale/actions";
import { BUSINESS } from "@/lib/business";
import { ATTACHMENT_RULES, GSTIN_PATTERN } from "@/lib/validation/enquiry";
import { readEnquiryList, useEnquiryList } from "./enquiry-list";

type ProductOption = { id: string; name: string; slug: string; category: string | null };
type Line = { key: string; productId: string; productName: string; quantity: string; specifications: string };

const newLine = (productId = ""): Line => ({ key: crypto.randomUUID(), productId, productName: "", quantity: "", specifications: "" });

function Field({ id, label, error, hint, required, children }: { id: string; label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
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
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** One numbered block of the form. A locked section stays readable but its fields are disabled. */
function Section({ n, title, subtitle, done, locked, sectionRef, children }: { sectionRef?: React.Ref<HTMLElement>; n: number; title: string; subtitle: string; done?: boolean; locked?: boolean; children: React.ReactNode }) {
  return (
    <section ref={sectionRef} aria-labelledby={`sec-${n}`} className="scroll-mt-28 border-t-2 border-ink/10 px-5 py-7 first:border-t-0 sm:px-9 sm:py-9">
      <header className="mb-6 flex items-start gap-4">
        <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold", done ? "bg-success text-white" : locked ? "border border-sand text-muted" : "bg-ink text-white shadow-md")}>
          {done ? <Check className="size-4" aria-hidden /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`sec-${n}`} className={clsx("font-display text-xl font-extrabold leading-tight tracking-tight", locked && "text-ink-soft")}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        {locked && (
          <span className="mt-1 hidden shrink-0 items-center gap-1.5 text-xs font-medium text-muted sm:inline-flex">
            <Lock className="size-3.5" aria-hidden /> Press Continue in step 1 to open this
          </span>
        )}
      </header>
      <fieldset disabled={locked} className={clsx("min-w-0 space-y-5 border-0 p-0 transition-opacity", locked && "opacity-60")}>
        <legend className="sr-only">{title}</legend>
        {children}
      </fieldset>
    </section>
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
  // Shop name and GST come first; the other sections stay disabled until both are valid.
  const [shopName, setShopName] = useState("");
  const [gst, setGst] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [shopError, setShopError] = useState("");
  const [gstError, setGstError] = useState("");
  const shopOk = shopName.trim().length >= 2;
  const gstOk = GSTIN_PATTERN.test(gst.trim().toUpperCase());
  const unlocked = confirmed && shopOk && gstOk;
  const contactRef = useRef<HTMLElement>(null);

  // "Continue" checks the two fields, says what is wrong, and only then opens the rest of the form.
  const continueToForm = () => {
    const g = gst.trim().toUpperCase();
    setShopError(shopOk ? "" : "Enter your shop name.");
    setGstError(gstOk ? "" : g.length === 15 ? "This GST number does not look right. Check it and try again." : `A GST number has 15 characters. You entered ${g.length}.`);
    if (!shopOk || !gstOk) return;
    setConfirmed(true);
    // Wait for the sections to enable, then take the buyer to the next one.
    setTimeout(() => contactRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
  };
  const formRef = useRef<HTMLFormElement>(null);
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
    // An item that is no longer in the quotable catalogue is kept as a named custom line, so nothing in the list silently disappears.
    const custom: string[] = [];
    for (const item of readEnquiryList()) {
      if (products.some((p) => p.id === item.id)) ids.add(item.id);
      else custom.push(item.name);
    }
    const seeded_ = [...[...ids].map((id) => newLine(id)), ...custom.map((name) => ({ ...newLine(), productName: name }))];
    setLines(seeded_.length ? seeded_ : [newLine()]);
  }, [preselectSlug, products]);

  useEffect(() => {
    // The success view replaces the form; "Send another" reloads for a fresh idempotency key.
    if (state.status === "success") list.clear();
    if (state.status === "error") {
      // Take the buyer to the first field with a problem; the banner at the top alone can be out of sight (e.g. the consent box).
      const bad = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (bad) {
        bad.scrollIntoView({ block: "center", behavior: "smooth" });
        bad.focus({ preventScroll: true });
        return;
      }
    }
    if (state.status !== "idle") statusRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (k: string) => (state.status === "error" ? state.fields[k] : undefined);
  const values = state.status === "error" ? state.values : {};
  const aria = (id: string, k: string) => ({ id, name: k, defaultValue: values[k], "aria-invalid": !!err(k) || undefined, "aria-describedby": err(k) ? `${id}-error` : undefined });
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="rounded-[1.4rem] border border-success/30 bg-paper p-8 outline-none sm:p-12">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h3 className="mt-5 font-display font-semibold text-title">Thank you, your request has been received.</h3>
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
    <form
      ref={formRef}
      key={state.status === "error" ? JSON.stringify(state.values) + state.message : "fresh"}
      action={formAction}
      noValidate
      className="overflow-hidden rounded-[1.4rem] border-2 border-ink/15 bg-white shadow-[0_30px_70px_-35px_rgb(18_22_76/0.55)]"
      aria-describedby={state.status === "error" ? `${uid}-status` : undefined}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div ref={statusRef} tabIndex={-1} id={`${uid}-status`} className="outline-none">
        {state.status === "error" && (
          <p role="alert" className="border-b border-danger/30 bg-danger-soft px-5 py-3 text-sm font-medium text-danger sm:px-9">
            {state.message}
          </p>
        )}
      </div>

      {/* 1 · Shop */}
      <Section n={1} title="Your shop" subtitle="Tell us who you are. This unlocks the rest of the form." done={unlocked}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${uid}-shop`} label="Shop name" required error={err("companyName") ?? (shopError || undefined)}>
            <input {...aria(`${uid}-shop`, "companyName")} aria-invalid={!!(err("companyName") || shopError) || undefined} defaultValue={undefined} value={shopName} onChange={(e) => (setShopName(e.target.value), setShopError(""), setConfirmed(false))} autoComplete="organization" className="field field-soft" placeholder="e.g. Sri Murugan Textiles" />
          </Field>
          <Field id={`${uid}-gst`} label="GST number" required error={err("gstNumber") ?? (gstError || undefined)} hint="15 characters, e.g. 33ABCDE1234F1Z5">
            <input {...aria(`${uid}-gst`, "gstNumber")} aria-invalid={!!(err("gstNumber") || gstError) || undefined} defaultValue={undefined} value={gst} onChange={(e) => (setGst(e.target.value.toUpperCase().replace(/s/g, "")), setGstError(""), setConfirmed(false))} maxLength={15} autoCapitalize="characters" autoComplete="off" className="field field-soft uppercase tracking-wide" placeholder="33ABCDE1234F1Z5" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button type="button" onClick={continueToForm} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-8 text-[0.95rem] font-semibold text-white transition-colors hover:bg-indigo-deep">
            {unlocked ? "Details confirmed" : "Continue"} {unlocked ? <Check className="size-4" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
          </button>
          {!unlocked && <p className="text-sm text-muted">Fill in both fields, then press Continue to open the rest of the form.</p>}
        </div>
      </Section>

      {/* 2 · Contact */}
      <Section n={2} sectionRef={contactRef} title="Contact details" subtitle="Where we send your price list and quotation." locked={!unlocked}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${uid}-name`} label="Your name" required error={err("customerName")}>
            <input {...aria(`${uid}-name`, "customerName")} autoComplete="name" className="field field-soft" />
          </Field>
          <Field id={`${uid}-phone`} label="Phone" required error={err("phone")} hint="With country code, e.g. +91 94430 22044">
            <input {...aria(`${uid}-phone`, "phone")} type="tel" autoComplete="tel" className="field field-soft" />
          </Field>
          <Field id={`${uid}-email`} label="Email" required error={err("email")}>
            <input {...aria(`${uid}-email`, "email")} type="email" autoComplete="email" className="field field-soft" />
          </Field>
          <Field id={`${uid}-country`} label="Country" error={err("country")}>
            <input {...aria(`${uid}-country`, "country")} autoComplete="country-name" className="field field-soft" placeholder="India" />
          </Field>
          <div className="sm:col-span-2">
            <Field id={`${uid}-address`} label="Shop address" error={err("address")} hint="Street, city and state, e.g. Erode, Tamil Nadu">
              <input {...aria(`${uid}-address`, "address")} autoComplete="street-address" className="field field-soft" />
            </Field>
          </div>
        </div>
      </Section>

      {/* 3 · Products */}
      <Section n={3} title="Products you need" subtitle="Pick products and rough quantities, or describe something custom." locked={!unlocked}>
        {err("items") && <p className="text-sm font-medium text-danger">{err("items")}</p>}
        <div className="hidden grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1.2fr)_2rem] gap-x-3 border-b border-ink pb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted md:grid" aria-hidden>
          <span>Product</span>
          <span>Qty</span>
          <span>Sizes, colours, fabric</span>
          <span />
        </div>
        <ol className="-mt-2">
          {lines.map((line, i) => (
            <li key={line.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-b border-line py-3 md:grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1.2fr)_2rem] md:items-center">
              <select
                id={`${uid}-p${i}`}
                name={`items.${i}.productId`}
                value={line.productId}
                onChange={(e) => update(line.key, { productId: e.target.value })}
                aria-label={`Product ${i + 1}`}
                className="field field-soft md:col-start-1 md:row-start-1"
                aria-invalid={!!err(`items.${i}.productName`) || undefined}
              >
                <option value="">Custom requirement</option>
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
              <button
                type="button"
                disabled={lines.length === 1}
                onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                aria-label={`Remove product ${i + 1}`}
                className="grid size-10 place-items-center text-muted transition-colors hover:text-danger disabled:pointer-events-none disabled:opacity-30 md:col-start-4 md:row-start-1 md:size-8"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
              <div className="col-span-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 md:contents">
                <input
                  id={`${uid}-q${i}`}
                  name={`items.${i}.quantity`}
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(e) => update(line.key, { quantity: e.target.value })}
                  aria-label={`Quantity for product ${i + 1} (pieces)`}
                  placeholder="Qty"
                  className="field field-soft md:col-start-2 md:row-start-1"
                  aria-invalid={!!err(`items.${i}.quantity`) || undefined}
                />
                <input
                  id={`${uid}-s${i}`}
                  name={`items.${i}.specifications`}
                  value={line.specifications}
                  onChange={(e) => update(line.key, { specifications: e.target.value })}
                  aria-label={`Sizes, colours, fabric for product ${i + 1}`}
                  placeholder="Optional"
                  className="field field-soft md:col-start-3 md:row-start-1"
                />
              </div>
              {!line.productId && (
                <input
                  id={`${uid}-n${i}`}
                  name={`items.${i}.productName`}
                  value={line.productName}
                  onChange={(e) => update(line.key, { productName: e.target.value })}
                  aria-label={`Describe custom product ${i + 1}`}
                  className="field field-soft col-span-full"
                  placeholder="What product do you need? e.g. cotton towels, 30 × 60 in"
                />
              )}
              {(err(`items.${i}.productName`) || err(`items.${i}.quantity`)) && (
                <p className="col-span-full text-xs font-medium text-danger">{err(`items.${i}.productName`) ?? err(`items.${i}.quantity`)}</p>
              )}
            </li>
          ))}
        </ol>
        {lines.length < 20 && (
          <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo transition-colors hover:text-indigo-deep">
            <Plus className="size-4" aria-hidden /> Add another product
          </button>
        )}
      </Section>

      {/* 4 · Requirement */}
      <Section n={4} title="Your requirement" subtitle="Anything that helps us quote accurately." locked={!unlocked}>
        <Field id={`${uid}-msg`} label="Requirement" required error={err("message")} hint="Delivery location, timelines, packing or branding needs.">
          <textarea {...aria(`${uid}-msg`, "message")} rows={4} className="field field-soft" />
        </Field>
        <Field id={`${uid}-files`} label={`Reference files (up to ${ATTACHMENT_RULES.maxFiles}, 8 MB each)`} error={err("attachments")} hint="JPG, PNG, WebP or PDF. Files are stored privately.">
          <label
            htmlFor={`${uid}-files`}
            className={clsx("flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-sand bg-paper px-4 py-4 text-sm hover:border-ink", err("attachments") && "border-danger")}
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
            <p id={`${uid}-consent-error`} className="mt-1.5 text-xs font-medium text-danger">
              {err("consent")}
            </p>
          )}
        </div>
      </Section>

      {/* Submit */}
      <div className="flex flex-col gap-4 border-t-2 border-ink/10 bg-mist px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <p className="text-sm text-muted">
          Prefer to call?{" "}
          <a href={BUSINESS.phone.href} className="font-medium text-ink underline underline-offset-4">
            {BUSINESS.phone.display}
          </a>
        </p>
        <button
          type="submit"
          name="intent"
          value="price_list"
          disabled={pending || !idempotencyKey || !unlocked}
          className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-indigo px-9 text-[0.95rem] font-semibold text-white transition-colors hover:bg-indigo-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? "Sending…" : "Request B2B Price List"}
        </button>
      </div>
    </form>
  );
}
