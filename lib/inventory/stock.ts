import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Stock is kept per size; products without sizes use one row with an empty size. */
export const sizeKey = (size: string | null | undefined) => size ?? "";

export class OutOfStockError extends Error {
  constructor(public productName: string, public size: string, public available: number) {
    super(`${productName}${size ? ` (${size})` : ""} has only ${available} left.`);
  }
}

/**
 * Takes stock for the lines of a new order, inside the order's transaction. Only products with tracked inventory are touched.
 * The decrement is conditional (quantity >= wanted), so two simultaneous orders can never take the same last unit.
 * Throws OutOfStockError, which rolls the whole order back.
 */
export async function reserveStock(tx: Tx, orderId: string, lines: { product_id: string; product_name: string; size: string | null; quantity: number }[]) {
  const tracked = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.product_id) }, track_inventory: true }, select: { id: true } });
  const trackedIds = new Set(tracked.map((p) => p.id));
  // Same product and size on two lines is taken together.
  const wanted = new Map<string, { product_id: string; product_name: string; size: string; quantity: number }>();
  for (const l of lines) {
    if (!trackedIds.has(l.product_id)) continue;
    const key = `${l.product_id}|${sizeKey(l.size)}`;
    const w = wanted.get(key);
    if (w) w.quantity += l.quantity;
    else wanted.set(key, { product_id: l.product_id, product_name: l.product_name, size: sizeKey(l.size), quantity: l.quantity });
  }
  for (const w of wanted.values()) {
    const res = await tx.productStock.updateMany({ where: { product_id: w.product_id, size: w.size, quantity: { gte: w.quantity } }, data: { quantity: { decrement: w.quantity } } });
    if (res.count !== 1) {
      const row = await tx.productStock.findUnique({ where: { product_id_size: { product_id: w.product_id, size: w.size } }, select: { quantity: true } });
      throw new OutOfStockError(w.product_name, w.size, row?.quantity ?? 0);
    }
    const after = await tx.productStock.findUniqueOrThrow({ where: { product_id_size: { product_id: w.product_id, size: w.size } }, select: { quantity: true } });
    await tx.stockMovement.create({ data: { product_id: w.product_id, size: w.size, delta: -w.quantity, quantity_after: after.quantity, reason: "order", order_id: orderId } });
  }
}

/** Puts an order's units back when it is cancelled. Safe to call twice: it does nothing if the order was already returned. */
export async function releaseStock(tx: Tx, orderId: string, actor: string | null) {
  const taken = await tx.stockMovement.findMany({ where: { order_id: orderId, reason: "order" } });
  if (!taken.length) return;
  if (await tx.stockMovement.findFirst({ where: { order_id: orderId, reason: "order_cancelled" }, select: { id: true } })) return;
  for (const m of taken) {
    const row = await tx.productStock.upsert({
      where: { product_id_size: { product_id: m.product_id, size: m.size } },
      create: { product_id: m.product_id, size: m.size, quantity: -m.delta },
      update: { quantity: { increment: -m.delta } },
      select: { quantity: true },
    });
    await tx.stockMovement.create({ data: { product_id: m.product_id, size: m.size, delta: -m.delta, quantity_after: row.quantity, reason: "order_cancelled", order_id: orderId, actor } });
  }
}
