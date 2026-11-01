"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import type { EnquiryFormState } from "@/app/(site)/wholesale/actions";
import { BUSINESS } from "@/lib/business";
import { ATTACHMENT_RULES } from "@/lib/validation/enquiry";
import { readEnquiryList, useEnquiryList } from "./enquiry-list";

type ProductOption = { id: string; name: string; slug: string; category: string | null };
type Line = { key: string; productId: string; productName: string; quantity: string; specifications: string };

const STEPS = ["What you need", "About you", "Details"] as const;
const STEP_HINTS = ["Products and quantities", "Who we reply to", "Requirement and reference files"] as const;
const STEP_TITLES = ["What are you looking for?", "Who should we reply to?", "Anything else we should know?"] as const;
const STEP_FIELDS: Record<number, string[]> = { 0: ["items"], 1: ["customerName", "companyName", "email", "phone", "country", "targetBudget"], 2: ["message", "attachments", "consent"] };

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
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  // A new server result adjusts state during render (not in an effect): reopen on the first step that has a problem.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.status === "error") {
      const first = [0, 1, 2].find((n) => STEP_FIELDS[n].some((k) => Object.keys(state.fields).some((f) => f === k || f.startsWith(`${k}.`))));
      if (first !== undefined) setStep(first);
    }
  }
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
    if (state.status !== "idle") statusRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (k: string) => (state.status === "error" ? state.fields[k] : undefined);
  const values = state.status === "error" ? state.values : {};
  const aria = (id: string, k: string) => ({ id, name: k, defaultValue: values[k], "aria-invalid": !!err(k) || undefined, "aria-describedby": err(k) ? `${id}-error` : undefined });
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const goNext = () => {
    const fd = new FormData(formRef.current!);
    const val = (k: string) => String(fd.get(k) ?? "").trim();
    let msg = "";
    if (step === 0) {
      if (lines.some((l) => !l.productId && !l.productName.trim())) msg = "Choose a product, or describe your custom requirement, for every line.";
    } else if (step === 1) {
      if (!val("customerName") || !val("email") || !val("phone")) msg = "Please fill in your name, business email and phone.";
    }
    setStepError(msg);
    if (!msg) setStep((n) => n + 1);
  };
  const goBack = () => {
    setStepError("");
    setStep((n) => n - 1);
  };

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
    <form ref={formRef} key={state.status === "error" ? JSON.stringify(state.values) + state.message : "fresh"} action={formAction} noValidate className="overflow-hidden rounded-[1.4rem] border border-line bg-white shadow-[0_40px_80px_-50px_rgb(18_22_76/0.45)]" aria-describedby={state.status === "error" ? `${uid}-status` : undefined}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid lg:grid-cols-[17rem_1fr]">
        <aside className="hidden flex-col justify-between gap-10 border-r border-line bg-paper p-8 lg:flex">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted">Wholesale enquiry</p>
            <ol className="mt-8 space-y-6" aria-label="Enquiry steps">
              {STEPS.map((label, n) => (
                <li key={label} aria-current={n === step ? "step" : undefined}>
                  <button type="button" disabled={n > step} onClick={() => (setStepError(""), setStep(n))} className="flex w-full items-start gap-4 text-left disabled:cursor-default">
                    <span className={clsx("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors", n <= step ? "bg-ink text-white" : "border border-sand text-muted")}>
                      {n < step ? <Check className="size-4" aria-hidden /> : n + 1}
                    </span>
                    <span>
                      <span className={clsx("block text-[0.95rem] font-semibold", n > step && "text-muted")}>{label}</span>
                      <span className="mt-0.5 block text-sm text-muted">{STEP_HINTS[n]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-3 border-t border-line pt-6 text-sm text-muted">
            <p>
              <span className="font-semibold tabular-nums text-ink">{lines.length}</span> {lines.length === 1 ? "product" : "products"} so far
            </p>
            <p>
              Prefer to call?{" "}
              <a href={BUSINESS.phone.href} className="font-medium text-ink underline underline-offset-4">
                {BUSINESS.phone.display}
              </a>
            </p>
          </div>
        </aside>
        <div className="min-w-0 space-y-7 p-6 sm:p-10">
      <div ref={statusRef} tabIndex={-1} id={`${uid}-status`} className="outline-none">
        {state.status === "error" && (
          <p role="alert" className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        )}
      </div>

      <ol className="flex items-center gap-2 sm:gap-3 lg:hidden" aria-label="Enquiry steps">
        {STEPS.map((label, n) => (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3" aria-current={n === step ? "step" : undefined}>
            <span className={clsx("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", n <= step ? "bg-indigo text-white" : "border border-line text-muted")}>
              {n < step ? <Check className="size-3.5" aria-hidden /> : n + 1}
            </span>
            <span className={clsx("hidden text-sm sm:inline", n === step ? "font-medium text-ink" : "text-muted")}>{label}</span>
            {n < STEPS.length - 1 && <span className={clsx("h-px flex-1", n < step ? "bg-indigo" : "bg-line")} aria-hidden />}
          </li>
        ))}
      </ol>

      <h3 className="font-display text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] font-bold leading-tight tracking-tight">{STEP_TITLES[step]}</h3>

      <fieldset className={clsx("space-y-5", step !== 0 && "hidden")}>
        <legend className="sr-only">1 · What you need</legend>
        {err("items") && <p className="text-sm text-danger">{err("items")}</p>}
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted">
            <span className="font-semibold tabular-nums text-ink">{lines.length}</span> {lines.length === 1 ? "product" : "products"} in this enquiry
          </p>
          {lines.length < 20 && (
            <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo transition-colors hover:text-indigo-deep">
              <Plus className="size-4" aria-hidden /> Add product
            </button>
          )}
        </div>
        <div className="hidden grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1.2fr)_2rem] gap-x-3 border-b border-ink px-0 pb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted md:grid" aria-hidden>
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
                <p className="col-span-full text-xs text-danger">{err(`items.${i}.productName`) ?? err(`items.${i}.quantity`)}</p>
              )}
            </li>
          ))}
        </ol>
      </fieldset>

      <fieldset className={clsx("grid gap-5 sm:grid-cols-2", step !== 1 && "hidden")}>
        <legend className="sr-only">2 · About you</legend>
        <Field id={`${uid}-name`} label="Your name" required error={err("customerName")}>
          <input {...aria(`${uid}-name`, "customerName")} autoComplete="name" className="field field-soft" />
        </Field>
        <Field id={`${uid}-company`} label="Company" error={err("companyName")}>
          <input {...aria(`${uid}-company`, "companyName")} autoComplete="organization" className="field field-soft" />
        </Field>
        <Field id={`${uid}-email`} label="Business email" required error={err("email")}>
          <input {...aria(`${uid}-email`, "email")} type="email" autoComplete="email" className="field field-soft" />
        </Field>
        <Field id={`${uid}-phone`} label="Phone with country code" required error={err("phone")} hint="e.g. +91 94430 22044">
          <input {...aria(`${uid}-phone`, "phone")} type="tel" autoComplete="tel" className="field field-soft" />
        </Field>
        <Field id={`${uid}-country`} label="Country / market" error={err("country")}>
          <input {...aria(`${uid}-country`, "country")} autoComplete="country-name" className="field field-soft" placeholder="India" />
        </Field>
        <Field id={`${uid}-budget`} label="Target price or budget" error={err("targetBudget")}>
          <input {...aria(`${uid}-budget`, "targetBudget")} className="field field-soft" />
        </Field>
      </fieldset>

      <fieldset className={clsx("space-y-5", step !== 2 && "hidden")}>
        <legend className="sr-only">3 · Details</legend>
        <Field id={`${uid}-msg`} label="Your requirement" required error={err("message")} hint="Delivery location, timelines, packing or branding needs — anything that helps us quote accurately.">
          <textarea {...aria(`${uid}-msg`, "message")} rows={4} className="field field-soft" />
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

      {stepError && (
        <p role="alert" className="text-sm text-danger">
          {stepError}
        </p>
      )}
      <div className="flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={goBack} className="inline-flex h-13 items-center gap-2 rounded-full border border-line px-6 text-[0.95rem] font-medium transition-colors hover:border-ink">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={goNext} className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-indigo px-8 text-[0.95rem] font-semibold text-white transition-colors hover:bg-indigo-deep sm:flex-none">
            Next <ArrowRight className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending || !idempotencyKey}
            className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-indigo px-8 text-[0.95rem] font-semibold text-white transition-colors hover:bg-indigo-deep disabled:opacity-60 sm:flex-none"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pending ? "Sending…" : "Send enquiry"}
          </button>
        )}
      </div>
        </div>
      </div>
    </form>
  );
}
