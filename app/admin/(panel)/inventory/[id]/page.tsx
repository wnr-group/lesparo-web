import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm, FieldError } from "@/components/admin/forms";
import { formatDate, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Alert, Badge } from "@/components/ui/primitives";
import { getStaffSession } from "@/lib/auth/staff";
import { jsonStrings } from "@/lib/catalogue/queries";
import { requestDb } from "@/lib/db";
import { stockInfo } from "@/lib/inventory/status";
import { saveStock } from "../actions";

const REASONS: Record<string, string> = { initial: "Initial count", adjustment: "Adjustment", order: "Retail order", order_cancelled: "Order cancelled" };

export default async function ProductInventoryPage(props: PageProps<"/admin/inventory/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await requestDb();
  const [p, session] = await Promise.all([
    db.product.findUnique({
      where: { id },
      select: { id: true, name: true, sku: true, sizes: true, track_inventory: true, low_stock_threshold: true, stock: { select: { size: true, quantity: true } }, stock_movements: { orderBy: { created_at: "desc" }, take: 25 } },
    }),
    getStaffSession(),
  ]);
  if (!p) notFound();
  const readOnly = !session?.isAdmin;
  const sizes = jsonStrings(p.sizes);
  const keys = sizes.length ? sizes : [""];
  const qtyOf = (k: string) => p.stock.find((s) => s.size === k)?.quantity ?? 0;
  const info = stockInfo(p.track_inventory, p.low_stock_threshold, p.stock.map((s) => s.quantity));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/inventory", label: "Inventory" }}
        title={p.name}
        description={p.sku ?? undefined}
        actions={info.level === "untracked" ? <Badge>Not tracked</Badge> : info.level === "out" ? <Badge tone="danger">Out of stock</Badge> : info.level === "low" ? <Badge tone="warning">Low stock</Badge> : <Badge tone="success">In stock</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Panel title="Stock">
          {readOnly && <Alert tone="info">Only admins can change stock.</Alert>}
          <ActionForm action={saveStock.bind(null, id)} submitLabel="Save stock" className={readOnly ? "pointer-events-none opacity-60" : undefined}>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="track" defaultChecked={p.track_inventory} className="mt-1" />
              <span>
                <span className="font-medium">Track stock for this product</span>
                <span className="block text-xs text-muted">Retail orders are limited to what is on hand, and the shop shows “Only N left” and “Out of stock”. Leave off for made-to-order or wholesale-only products.</span>
              </span>
            </label>
            <div className="mt-5">
              <label htmlFor="threshold" className="mb-1 block text-sm font-medium">
                Low stock alert at
              </label>
              <input id="threshold" name="threshold" type="number" min={0} step={1} defaultValue={p.low_stock_threshold} className="field h-10 w-32 py-0" />
              <p className="mt-1 text-xs text-muted">Shoppers see “Only N left” when the total across sizes is this number or fewer.</p>
              <FieldError name="threshold" />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">{sizes.length ? "Units on hand by size" : "Units on hand"}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {keys.map((k) => (
                  <div key={k || "one"}>
                    <label htmlFor={`qty:${k}`} className="mb-1 block text-xs text-muted">
                      {k || "Quantity"}
                    </label>
                    <input id={`qty:${k}`} name={`qty:${k}`} type="number" min={0} step={1} defaultValue={qtyOf(k)} className="field h-10 py-0 tabular-nums" />
                    <FieldError name={`qty:${k}`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <label htmlFor="note" className="mb-1 block text-sm font-medium">
                Note <span className="font-normal text-muted">(optional, saved with the change)</span>
              </label>
              <input id="note" name="note" maxLength={200} placeholder="e.g. New delivery from factory" className="field h-10 py-0" />
            </div>
          </ActionForm>
        </Panel>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Recent changes</h2>
          {p.stock_movements.length ? (
            <Table head={["When", "Size", "Change", "Now", "Reason", "By"]}>
              {p.stock_movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-ink-soft">{formatDate(m.created_at, true)}</td>
                  <td className="px-4 py-2">{m.size || "—"}</td>
                  <td className={`px-4 py-2 tabular-nums ${m.delta < 0 ? "text-danger" : "text-success"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td className="px-4 py-2 tabular-nums">{m.quantity_after}</td>
                  <td className="px-4 py-2 text-ink-soft">
                    {REASONS[m.reason] ?? m.reason}
                    {m.note && <span className="block text-xs text-muted">{m.note}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">{m.actor ?? "System"}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-muted">No stock changes yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
