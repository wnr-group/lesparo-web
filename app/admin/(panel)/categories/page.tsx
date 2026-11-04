import Link from "next/link";
import { PageHeader, Table } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { requestDb } from "@/lib/db";

export default async function AdminCategoriesPage() {
  const db = await requestDb();
  const [all, products] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, slug: true, parent_id: true, display_order: true, is_published: true, is_featured: true }, orderBy: { display_order: "asc" } }),
    db.product.findMany({ where: { archived_at: null }, select: { category_id: true } }),
  ]);
  const counts = new Map<string, number>();
  for (const p of products) if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);

  const ordered: { c: (typeof all)[number]; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) =>
    all.filter((c) => c.parent_id === parent).forEach((c) => {
      ordered.push({ c, depth });
      walk(c.id, depth + 1);
    });
  walk(null, 0);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Products are counted against the category they are directly assigned to."
        actions={
          <Link href="/admin/categories/new" className={buttonClass("primary", "sm")}>
            Add category
          </Link>
        }
      />
      <Table head={["Category", "Slug", "Products", "Order", "Status"]}>
        {ordered.map(({ c, depth }) => (
          <tr key={c.id} className="hover:bg-ivory">
            <td className="px-4 py-2.5" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
              {depth > 0 && <span className="mr-2 text-sand">└</span>}
              <Link href={`/admin/categories/${c.id}`} className="font-medium text-indigo hover:underline">
                {c.name}
              </Link>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-muted">{c.slug}</td>
            <td className="px-4 py-2.5 tabular-nums">{counts.get(c.id) ?? 0}</td>
            <td className="px-4 py-2.5 tabular-nums text-muted">{c.display_order}</td>
            <td className="space-x-1 px-4 py-2.5">
              {c.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Hidden</Badge>}
              {c.is_featured && <Badge tone="brass">Featured</Badge>}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
