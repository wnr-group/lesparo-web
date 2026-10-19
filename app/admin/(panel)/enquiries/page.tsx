import Link from "next/link";
import { EnquiryStatusBadge, formatDate, PageHeader, Pagination, SyncBadge, Table } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/primitives";
import { sanitiseSearch } from "@/lib/catalogue/queries";
import { createClient } from "@/lib/supabase/server";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, type EnquiryStatus } from "@/lib/validation/enquiry";

const PAGE_SIZE = 25;
const ACTIVE: EnquiryStatus[] = ["under_review", "info_required", "quotation_prepared"];

export default async function EnquiriesPage(props: PageProps<"/admin/enquiries">) {
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sanitiseSearch(sp.q) : "";
  const sync = sp.sync === "issues";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await createClient();
  let req = db
    .from("wholesale_enquiries")
    .select("id, enquiry_number, customer_name, company_name, email, country, status, crm_sync_status, created_at, follow_up_at, enquiry_items(count)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status === "active") req = req.in("status", ACTIVE);
  else if ((ENQUIRY_STATUSES as readonly string[]).includes(status)) req = req.eq("status", status as EnquiryStatus);
  if (q) req = req.or(`enquiry_number.ilike.%${q}%,customer_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (sync) {
    const { data: jobs } = await db.from("integration_jobs").select("entity_id").in("status", ["failed", "blocked"]).limit(1000);
    req = req.in("id", [...new Set((jobs ?? []).map((j) => j.entity_id))].concat("00000000-0000-0000-0000-000000000000"));
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await req.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (sync) params.set("sync", "issues");
    if (p > 1) params.set("page", String(p));
    return `/admin/enquiries${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Wholesale enquiries" description={`${count ?? 0} matching`} />
      <form className="mb-4 flex flex-wrap items-end gap-3" action="/admin/enquiries">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs text-muted">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Reference, name, company, email" className="field h-9 w-72 py-0 text-sm" />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-muted">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field h-9 py-0 text-sm">
            <option value="">All</option>
            <option value="active">Awaiting quotation (active)</option>
            {ENQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ENQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="sync" value="issues" defaultChecked={sync} className="accent-indigo" /> Integration issues only
        </label>
        <button type="submit" className="h-9 bg-ink px-4 text-sm text-paper">
          Filter
        </button>
      </form>

      {data.length ? (
        <Table head={["Reference", "Buyer", "Lines", "Received", "Follow-up", "Status", "CRM"]}>
          {data.map((e) => (
            <tr key={e.id} className="hover:bg-ivory">
              <td className="px-4 py-3">
                <Link href={`/admin/enquiries/${e.id}`} className="font-medium tabular-nums text-indigo hover:underline">
                  {e.enquiry_number}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="block">{e.company_name ?? e.customer_name}</span>
                <span className="text-xs text-muted">
                  {e.company_name ? `${e.customer_name} · ` : ""}
                  {e.country ?? ""}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums">{(e.enquiry_items as unknown as { count: number }[])[0]?.count ?? 0}</td>
              <td className="px-4 py-3 text-muted">{formatDate(e.created_at, true)}</td>
              <td className="px-4 py-3 text-muted">{formatDate(e.follow_up_at)}</td>
              <td className="px-4 py-3">
                <EnquiryStatusBadge status={e.status as EnquiryStatus} />
              </td>
              <td className="px-4 py-3">
                <SyncBadge status={e.crm_sync_status} />
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title={q || status || sync ? "No enquiries match these filters" : "No enquiries yet"}>
          {q || status || sync ? <Link href="/admin/enquiries" className="underline">Clear filters</Link> : "Enquiries submitted through the wholesale form will appear here."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={pageCount} href={href} />
    </>
  );
}
