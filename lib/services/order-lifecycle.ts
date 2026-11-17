import "server-only";
import { prisma } from "@/lib/db";
import { releaseStock } from "@/lib/inventory/stock";

/** How long a buyer has to pay for an online order before it is cancelled and its stock goes back on sale. */
export const PAYMENT_WINDOW_MS = 30 * 60 * 1000;
export const paymentDeadline = (from = new Date()) => new Date(from.getTime() + PAYMENT_WINDOW_MS);

/**
 * Cancels online-payment orders that were not paid by their deadline and returns the stock they were holding.
 *  - Orders whose payment is "verifying" (authorized, waiting for capture) are left alone.
 *  - Each order is cancelled and its stock returned in ONE transaction, and only if it is still unpaid at that moment,
 *    so a payment that lands during the run is never cancelled, and running this twice returns the units once.
 * Returns the ids it cancelled. The caller refreshes the cached catalogue (server actions use updateTag, routes use revalidateTag).
 */
export async function expireUnpaidOrders(now = new Date(), limit = 50): Promise<string[]> {
  const due = await prisma.retailOrder.findMany({
    where: { payment_method: "razorpay", status: { not: "cancelled" }, payment_status: { in: ["pending", "failed"] }, payment_due_at: { lt: now } },
    select: { id: true },
    orderBy: { payment_due_at: "asc" },
    take: limit,
  });
  const cancelled: string[] = [];
  for (const { id } of due) {
    const done = await prisma.$transaction(async (tx) => {
      const moved = await tx.retailOrder.updateMany({ where: { id, status: { not: "cancelled" }, payment_status: { in: ["pending", "failed"] } }, data: { status: "cancelled" } });
      if (moved.count !== 1) return false;
      await tx.orderAudit.create({ data: { order_id: id, actor: "system", action: "order_status", from_value: "new", to_value: "cancelled (payment not received in time)" } });
      await releaseStock(tx, id, "system");
      return true;
    });
    if (done) cancelled.push(id);
  }
  return cancelled;
}
