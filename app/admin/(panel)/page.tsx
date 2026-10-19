import Link from "next/link";
import { EnquiryStatusBadge, formatDate, PageHeader, Panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { integrationStatus } from "@/lib/integrations/registry";
import { createClient } from "@/lib/supabase/server";
import type { EnquiryStatus } from "@/lib/validation/enquiry";

export default async function DashboardPage() {
  const db = await createClient();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [published, drafts, categories, newEnquiries, awaiting, failedJobs, recent] = await Promise.all([
    count(db.from("products").select("id", { count: "exact", head: true }).eq("is_published", true).is("archived_at", null)),
    count(db.from("products").select("id", { count: "exact", head: true }).eq("is_published", false).is("archived_at", null)),
    count(db.from("categories").select("id", { count: "exact", head: true }).eq("is_published", true)),
    count(db.from("wholesale_enquiries").select("id", { count: "exact", head: true }).eq("status", "new")),
    count(db.from("wholesale_enquiries").select("id", { count: "exact", head: true }).in("status", ["under_review", "info_required", "quotation_prepared"])),
    count(db.from("integration_jobs").select("id", { count: "exact", head: true }).in("status", ["failed", "blocked"])),
    db.from("wholesale_enquiries").select("id, enquiry_number, customer_name, company_name, status, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  const integrations = integrationStatus();

  const stats = [
    { label: "New enquiries", value: newEnquiries, href: "/admin/enquiries?status=new" },
    { label: "Awaiting quotation", value: awaiting, href: "/admin/enquiries?status=active" },
    { label: "Published products", value: published, href: "/admin/products?status=published" },
    { label: "Draft products", value: drafts, href: "/admin/products?status=draft" },
    { label: "Published categories", value: categories, href: "/admin/categories" },
    { label: "Integration issues", value: failedJobs, href: "/admin/enquiries?sync=issues" },
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
      <ul className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <li key={s.label} className="bg-plate">
            <Link href={s.href} className="block p-5 hover:bg-ivory">
              <p className="font-display font-semibold text-4xl tabular-nums lining-nums">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Recent enquiries" actions={<Link href="/admin/enquiries" className="text-xs text-muted hover:text-ink">View all</Link>}>
          {recent.data?.length ? (
            <ul className="-my-3 divide-y divide-line">
              {recent.data.map((e) => (
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

        <Panel title="Integrations">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">CRM</dt>
              <dd>{integrations.crm ? `${integrations.crm.provider}${integrations.crm.live ? "" : " (test only)"}` : "Not configured"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Email</dt>
              <dd>{integrations.email ? `${integrations.email.provider}${integrations.email.live ? "" : " (test only)"}` : "Not configured"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Sales inbox</dt>
              <dd className="truncate">{integrations.salesInbox ?? "Not set"}</dd>
            </div>
          </dl>
          {(!integrations.crm || !integrations.email) && (
            <div className="mt-4">
              <Alert tone="warning" title="Enquiries are stored, but not yet forwarded">
                New enquiries are saved here. CRM sync and email notifications start once a provider is configured; queued jobs can then be retried from each enquiry.
              </Alert>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
