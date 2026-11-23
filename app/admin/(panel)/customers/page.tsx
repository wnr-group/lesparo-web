import Link from "next/link";
import { formatDate, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/primitives";
import type { Prisma } from "@prisma/client";
import { requestDb } from "@/lib/db";

const PAGE_SIZE = 25;

/** Website accounts. Only safe columns are selected: the password hash and session data never leave the database. */
export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const verified = sp.verified === "yes" || sp.verified === "no" ? sp.verified : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await requestDb();
  const where: Prisma.CustomerWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }),
    ...(verified === "yes" && { email_verified_at: { not: null } }),
    ...(verified === "no" && { email_verified_at: null }),
  };
  const [customers, count] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, email_verified_at: true, created_at: true, _count: { select: { orders: true, enquiries: true } } },
    }),
    db.customer.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q && { q }), ...(verified && { verified }), ...(p > 1 && { page: String(p) }) })}`;

  return (
    <>
      <PageHeader title="Customers" description={`${count} registered account${count === 1 ? "" : "s"}. Guest checkouts and enquiries are not listed here; they stay under Orders and Enquiries.`} />
      <form className="mb-4 flex flex-wrap items-end gap-3" action="/admin/customers">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs text-muted">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, email or mobile" className="field h-9 w-64 py-0 text-sm" />
        </div>
        <div>
          <label htmlFor="verified" className="mb-1 block text-xs text-muted">
            Email
          </label>
          <select id="verified" name="verified" defaultValue={verified} className="field h-9 py-0 text-sm">
            <option value="">All</option>
            <option value="yes">Verified</option>
            <option value="no">Not verified</option>
          </select>
        </div>
        <button type="submit" className="h-9 rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-indigo">
          Filter
        </button>
      </form>
      {customers.length ? (
        <Table head={["Customer", "Mobile", "Joined", "Orders", "Enquiries", "Email"]}>
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-ivory">
              <td className="px-4 py-2">
                <Link href={`/admin/customers/${c.id}`} className="font-medium text-indigo hover:underline">
                  {c.name}
                </Link>
                <span className="block text-xs text-muted">{c.email}</span>
              </td>
              <td className="px-4 py-2 text-ink-soft">{c.phone}</td>
              <td className="px-4 py-2 text-ink-soft">{formatDate(c.created_at)}</td>
              <td className="px-4 py-2 tabular-nums">{c._count.orders}</td>
              <td className="px-4 py-2 tabular-nums">{c._count.enquiries}</td>
              <td className="px-4 py-2">{c.email_verified_at ? <Badge tone="success">Verified</Badge> : <Badge tone="brass">Not verified</Badge>}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No customers found">{q || verified ? <Link href="/admin/customers" className="underline">Clear filters</Link> : "Accounts created on the website will appear here."}</EmptyState>
      )}
      <Pagination page={page} pageCount={pageCount} href={href} />
    </>
  );
}
