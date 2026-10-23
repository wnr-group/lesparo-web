import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionButton, ActionForm, FieldError } from "@/components/admin/forms";
import { EnquiryStatusBadge, formatDate, PageHeader, Panel, SyncBadge } from "@/components/admin/ui";
import { Badge } from "@/components/ui/primitives";
import { getStaffSession } from "@/lib/auth/staff";
import { requestDb } from "@/lib/db";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, type EnquiryStatus } from "@/lib/validation/enquiry";
import { addNote, retryIntegrationJob, updateEnquiry } from "../actions";

const JOB_LABELS: Record<string, string> = {
  "crm.create_enquiry": "Create CRM record",
  "email.sales_notification": "Notify sales inbox",
  "email.buyer_confirmation": "Buyer confirmation email",
};

function toLocalInput(date: Date | null) {
  if (!date) return "";
  // datetime-local in IST
  return new Date(date.getTime() + 5.5 * 3600_000).toISOString().slice(0, 16);
}

export default async function EnquiryDetailPage(props: PageProps<"/admin/enquiries/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await requestDb();
  const session = await getStaffSession();

  const e = await db.wholesaleEnquiry.findUnique({
    where: { id },
    include: {
      items: { orderBy: { display_order: "asc" } },
      attachments: true,
      notes: { orderBy: { created_at: "asc" } },
      status_history: { orderBy: { changed_at: "asc" } },
    },
  });
  if (!e) notFound();
  const jobs = await db.integrationJob.findMany({ where: { entity_id: id }, orderBy: { created_at: "asc" } });

  // Downloads go through a staff-only route (files are not publicly reachable).
  const attachments = e.attachments.map((a) => ({ ...a, url: `/admin/attachments/${a.id}` }));
  const items = e.items;
  const notes = e.notes;
  const history = e.status_history;
  const productIds = items.map((i) => i.product_id).filter((x): x is string => !!x);
  const products = productIds.length ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, slug: true } }) : [];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/enquiries", label: "Enquiries" }}
        title={e.enquiry_number}
        description={<>Received {formatDate(e.created_at, true)} · via {e.source}</>}
        actions={
          <span className="flex items-center gap-2">
            <EnquiryStatusBadge status={e.status as EnquiryStatus} />
            <SyncBadge status={e.crm_sync_status} />
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Requested products">
            <ol className="-my-3 divide-y divide-line">
              {items.map((i) => {
                const slug = products.find((p) => p.id === i.product_id)?.slug;
                return (
                  <li key={i.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-medium">
                        {slug ? (
                          <Link href={`/products/${slug}`} target="_blank" className="hover:underline">
                            {i.product_name_snapshot} ↗
                          </Link>
                        ) : (
                          i.product_name_snapshot
                        )}
                        {!i.product_id && <Badge className="ml-2">Custom</Badge>}
                      </p>
                      {i.specifications && <p className="text-sm text-ink-soft">{i.specifications}</p>}
                    </div>
                    <p className="tabular-nums text-ink-soft">{i.quantity ? `${i.quantity.toLocaleString("en-IN")} pcs` : "Qty not given"}</p>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel title="Message">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{e.message}</p>
            {e.target_budget && (
              <p className="mt-4 text-sm">
                <span className="text-muted">Target price / budget:</span> {e.target_budget}
              </p>
            )}
          </Panel>

          <Panel title={`Attachments (${attachments.length})`}>
            {attachments.length ? (
              <ul className="space-y-2 text-sm">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <FileText className="size-4 text-muted" aria-hidden />
                    {a.url ? (
                      <a href={a.url} className="text-indigo hover:underline" rel="noopener noreferrer">
                        {a.original_filename}
                      </a>
                    ) : (
                      <span>{a.original_filename} (unavailable)</span>
                    )}
                    <span className="text-xs text-muted">{Math.ceil(a.file_size / 1024)} KB</span>
                  </li>
                ))}
                <li className="pt-1 text-xs text-muted">Downloads are available to signed-in staff only.</li>
              </ul>
            ) : (
              <p className="text-sm text-muted">No files attached.</p>
            )}
          </Panel>

          <Panel title="Internal notes">
            <p className="mb-4 text-xs text-muted">Visible to staff only — never shown to the buyer.</p>
            {notes.length > 0 && (
              <ol className="mb-6 space-y-4">
                {notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-sand pl-4">
                    <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                    <p className="mt-1 text-xs text-muted">
                      {n.author_id === session?.userId ? "You" : "Staff"} · {formatDate(n.created_at, true)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <ActionForm action={addNote.bind(null, id)} submitLabel="Add note" successMessage="Note added." resetOnSuccess>
              <label htmlFor="note" className="sr-only">
                Note
              </label>
              <textarea id="note" name="note" rows={3} className="field text-sm" placeholder="Call notes, sampling, pricing considerations…" />
            </ActionForm>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Buyer">
            <dl className="space-y-2 text-sm">
              {[
                ["Name", e.customer_name],
                ["Company", e.company_name],
                ["Country", e.country],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr] gap-2">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v ?? "—"}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <dt className="text-muted">Email</dt>
                <dd className="break-all">
                  <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Your LESPARO enquiry ${e.enquiry_number}`)}`} className="text-indigo hover:underline">
                    {e.email}
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <dt className="text-muted">Phone</dt>
                <dd>
                  <a href={`tel:${e.phone.replace(/[^\d+]/g, "")}`} className="text-indigo hover:underline">
                    {e.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Status & quotation">
            <ActionForm action={updateEnquiry.bind(null, id)} submitLabel="Save changes">
                <div className="grid gap-4 text-sm">
                  <div>
                    <label htmlFor="status" className="mb-1 block text-xs text-muted">
                      Status
                    </label>
                    <select id="status" name="status" defaultValue={e.status} className="field h-10 py-0">
                      {ENQUIRY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ENQUIRY_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-[1fr_6rem] gap-3">
                    <div>
                      <label htmlFor="quotationAmount" className="mb-1 block text-xs text-muted">
                        Quotation amount
                      </label>
                      <input id="quotationAmount" name="quotationAmount" inputMode="decimal" defaultValue={e.quotation_amount ?? ""} className="field h-10 py-0" />
                      <FieldError name="quotationAmount" />
                    </div>
                    <div>
                      <label htmlFor="quotationCurrency" className="mb-1 block text-xs text-muted">
                        Currency
                      </label>
                      <input id="quotationCurrency" name="quotationCurrency" defaultValue={e.quotation_currency ?? "INR"} maxLength={3} className="field h-10 py-0 uppercase" />
                      <FieldError name="quotationCurrency" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="quotationValidUntil" className="mb-1 block text-xs text-muted">
                      Valid until
                    </label>
                    <input id="quotationValidUntil" name="quotationValidUntil" type="date" defaultValue={e.quotation_valid_until ?? ""} className="field h-10 py-0" />
                  </div>
                  <div>
                    <label htmlFor="quotationDetails" className="mb-1 block text-xs text-muted">
                      Quotation details
                    </label>
                    <textarea id="quotationDetails" name="quotationDetails" rows={3} defaultValue={e.quotation_details ?? ""} className="field" />
                  </div>
                  <div>
                    <label htmlFor="followUpAt" className="mb-1 block text-xs text-muted">
                      Follow up on (IST)
                    </label>
                    <input id="followUpAt" name="followUpAt" type="datetime-local" defaultValue={toLocalInput(e.follow_up_at)} className="field h-10 py-0" />
                    <FieldError name="followUpAt" />
                  </div>
                  <div>
                    <label htmlFor="followUpOutcome" className="mb-1 block text-xs text-muted">
                      Follow-up outcome
                    </label>
                    <input id="followUpOutcome" name="followUpOutcome" defaultValue={e.follow_up_outcome ?? ""} className="field h-10 py-0" />
                  </div>
                </div>
            </ActionForm>
          </Panel>

          <Panel title="Integrations">
            {jobs.length ? (
              <ul className="space-y-3 text-sm">
                {jobs.map((j) => (
                  <li key={j.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span>{JOB_LABELS[j.operation] ?? j.operation}</span>
                      <Badge tone={j.status === "succeeded" ? "success" : j.status === "blocked" || j.status === "failed" ? "warning" : "neutral"}>{j.status}</Badge>
                    </div>
                    {j.last_error && <p className="mt-1 text-xs text-muted">{j.last_error}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {j.attempts} attempt{j.attempts === 1 ? "" : "s"} · {j.provider}
                    </p>
                    {(j.status === "failed" || j.status === "blocked") && (
                      <div className="mt-2">
                        <ActionButton action={retryIntegrationJob.bind(null, j.id)}>Retry now</ActionButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No integration jobs.</p>
            )}
            {e.crm_record_id && <p className="mt-3 text-xs text-muted">CRM record: {e.crm_record_id}</p>}
          </Panel>

          <Panel title="Status history">
            <ol className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between gap-3">
                  <span>{ENQUIRY_STATUS_LABELS[h.to_status as EnquiryStatus]}</span>
                  <span className="text-xs text-muted">{formatDate(h.changed_at, true)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
