import Link from "next/link";
import { EnquiryStatusBadge, formatDate, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/primitives";
import { sanitiseSearch } from "@/lib/catalogue/queries";
import type { Prisma } from "@prisma/client";
import { requestDb } from "@/lib/db";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, type EnquiryStatus } from "@/lib/validation/enquiry";

const PAGE_SIZE = 25;
const ACTIVE: EnquiryStatus[] = ["under_review", "info_required", "quotation_prepared"];

export default async function EnquiriesPage(props: PageProps<"/admin/enquiries">) {
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sanitiseSearch(sp.q) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await requestDb();
  const where: Prisma.WholesaleEnquiryWhereInput = {
    ...(status === "active" ? { status: { in: ACTIVE } } : (ENQUIRY_STATUSES as readonly string[]).includes(status) ? { status } : {}),
    ...(q && { OR: [{ enquiry_number: { contains: q, mode: "insensitive" as const } }, { customer_name: { contains: q, mode: "insensitive" as const } }, { company_name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] }),
  };

  const [data, count] = await Promise.all([
    db.wholesaleEnquiry.findMany({
      where,
      select: {
        id: true, enquiry_number: true, customer_name: true, company_name: true, email: true, country: true, status: true, created_at: true, follow_up_at: true, admin_seen_at: true,
        _count: { select: { items: true } },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.wholesaleEnquiry.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    return `/admin/enquiries${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Wholesale enquiries" description={`${count} matching`} />
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
        <button type="submit" className="h-9 rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-indigo">
          Filter
        </button>
      </form>

      {data.length ? (
        <Table head={["Reference", "Buyer", "Lines", "Received", "Follow-up", "Status"]}>
          {data.map((e) => (
            <tr key={e.id} className="hover:bg-ivory">
              <td className="px-4 py-3">
                <Link href={`/admin/enquiries/${e.id}`} className={`inline-flex items-center gap-2 tabular-nums text-indigo hover:underline ${e.admin_seen_at ? "font-medium" : "font-bold"}`}>
                  {!e.admin_seen_at && <span aria-hidden className="size-2 rounded-full bg-danger" />}
                  {e.enquiry_number}
                  {!e.admin_seen_at && <span className="sr-only"> (unread)</span>}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="block">{e.company_name ?? e.customer_name}</span>
                <span className="text-xs text-muted">
                  {e.company_name ? `${e.customer_name} · ` : ""}
                  {e.country ?? ""}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums">{e._count.items}</td>
              <td className="px-4 py-3 text-muted">{formatDate(e.created_at, true)}</td>
              <td className="px-4 py-3 text-muted">{formatDate(e.follow_up_at)}</td>
              <td className="px-4 py-3">
                <EnquiryStatusBadge status={e.status as EnquiryStatus} />
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title={q || status ? "No enquiries match these filters" : "No enquiries yet"}>
          {q || status ? <Link href="/admin/enquiries" className="underline">Clear filters</Link> : "Enquiries submitted through the wholesale form will appear here."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={pageCount} href={href} />
    </>
  );
}
