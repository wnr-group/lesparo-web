import Link from "next/link";
import { EnquiryStatusBadge, formatDate, PageHeader, Panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { requestDb } from "@/lib/db";
import type { EnquiryStatus } from "@/lib/validation/enquiry";

export default async function DashboardPage() {
  const db = await requestDb();

  const [published, drafts, categories, newEnquiries, awaiting, recent] = await Promise.all([
    db.product.count({ where: { is_published: true, archived_at: null } }),
    db.product.count({ where: { is_published: false, archived_at: null } }),
    db.category.count({ where: { is_published: true } }),
    db.wholesaleEnquiry.count({ where: { status: "new" } }),
    db.wholesaleEnquiry.count({ where: { status: { in: ["under_review", "info_required", "quotation_prepared"] } } }),
    db.wholesaleEnquiry.findMany({
      select: { id: true, enquiry_number: true, customer_name: true, company_name: true, status: true, created_at: true },
      orderBy: { created_at: "desc" },
      take: 6,
    }),
  ]);

  const stats = [
    { label: "New enquiries", value: newEnquiries, href: "/admin/enquiries?status=new" },
    { label: "Awaiting quotation", value: awaiting, href: "/admin/enquiries?status=active" },
    { label: "Published products", value: published, href: "/admin/products?status=published" },
    { label: "Draft products", value: drafts, href: "/admin/products?status=draft" },
    { label: "Published categories", value: categories, href: "/admin/categories" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Link href="/admin/enquiries?status=new" className={buttonClass("primary", "sm")}>
              Review new enquiries
            </Link>
            <Link href="/admin/products/new" className={buttonClass("secondary", "sm")}>
              Add product
            </Link>
          </>
        }
      />
      <ul className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label} className="bg-plate">
            <Link href={s.href} className="block p-5 hover:bg-ivory">
              <p className="font-display font-semibold text-4xl tabular-nums lining-nums">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Panel title="Recent enquiries" actions={<Link href="/admin/enquiries" className="text-xs text-muted hover:text-ink">View all</Link>}>
          {recent.length ? (
            <ul className="-my-3 divide-y divide-line">
              {recent.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enquiries/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-indigo">
                    <span>
                      <span className="font-medium tabular-nums">{e.enquiry_number}</span> · {e.company_name ?? e.customer_name}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted">
                      {formatDate(e.created_at, true)}
                      <EnquiryStatusBadge status={e.status as EnquiryStatus} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No enquiries yet. They appear here as soon as buyers submit the wholesale form.</p>
          )}
        </Panel>

      </div>
    </>
  );
}
