import "server-only";
import { prisma } from "@/lib/db";
import { MAX_ADDRESSES } from "@/lib/validation/customer";

/**
 * Everything a signed-in customer can read or change. Every query is scoped by the customer id taken from the session;
 * a record that belongs to someone else is indistinguishable from one that does not exist.
 */
export type AddressInput = { label: string; fullName: string; phone: string; line: string; city: string; state: string; postcode: string; isDefault: boolean };

export const listAddresses = (customerId: string) => prisma.customerAddress.findMany({ where: { customer_id: customerId }, orderBy: [{ is_default: "desc" }, { created_at: "asc" }] });

const data = (a: AddressInput) => ({ label: a.label, full_name: a.fullName, phone: a.phone, line: a.line, city: a.city, state: a.state, postcode: a.postcode });

export async function saveAddress(customerId: string, input: AddressInput, addressId?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  return prisma.$transaction(async (tx) => {
    const count = await tx.customerAddress.count({ where: { customer_id: customerId } });
    let id = addressId;
    if (id) {
      const updated = await tx.customerAddress.updateMany({ where: { id, customer_id: customerId }, data: data(input) });
      if (!updated.count) return { ok: false as const, message: "Address not found." };
    } else {
      if (count >= MAX_ADDRESSES) return { ok: false as const, message: `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.` };
      // The first address is always the default.
      const row = await tx.customerAddress.create({ data: { ...data(input), customer_id: customerId, is_default: count === 0 }, select: { id: true } });
      id = row.id;
    }
    if (input.isDefault) {
      await tx.customerAddress.updateMany({ where: { customer_id: customerId, id: { not: id } }, data: { is_default: false } });
      await tx.customerAddress.update({ where: { id }, data: { is_default: true } });
    }
    return { ok: true as const };
  });
}

export async function makeDefaultAddress(customerId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.customerAddress.findFirst({ where: { id: addressId, customer_id: customerId }, select: { id: true } });
    if (!owned) return false;
    await tx.customerAddress.updateMany({ where: { customer_id: customerId }, data: { is_default: false } });
    await tx.customerAddress.update({ where: { id: addressId }, data: { is_default: true } });
    return true;
  });
}

export async function deleteAddress(customerId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const gone = await tx.customerAddress.deleteMany({ where: { id: addressId, customer_id: customerId } });
    if (!gone.count) return false;
    // Keep one default whenever any address remains.
    const left = await tx.customerAddress.findMany({ where: { customer_id: customerId }, orderBy: { created_at: "asc" }, select: { id: true, is_default: true } });
    if (left.length && !left.some((a) => a.is_default)) await tx.customerAddress.update({ where: { id: left[0].id }, data: { is_default: true } });
    return true;
  });
}

export const listOrders = (customerId: string) =>
  prisma.retailOrder.findMany({ where: { customer_id: customerId }, orderBy: { created_at: "desc" }, include: { items: { select: { product_name: true, quantity: true } } }, take: 100 });

export const getOrder = (customerId: string, orderNumber: string) =>
  prisma.retailOrder.findFirst({ where: { order_number: orderNumber, customer_id: customerId }, include: { items: true, payments: { orderBy: { created_at: "asc" }, select: { id: true, status: true, method: true, amount: true, currency: true, created_at: true } } } });

export const listEnquiries = (customerId: string) =>
  prisma.wholesaleEnquiry.findMany({ where: { customer_id: customerId }, orderBy: { created_at: "desc" }, include: { items: { orderBy: { display_order: "asc" } } }, take: 100 });

export async function accountSummary(customerId: string) {
  const [orders, openOrders, enquiries, addresses, recent] = await Promise.all([
    prisma.retailOrder.count({ where: { customer_id: customerId } }),
    prisma.retailOrder.count({ where: { customer_id: customerId, status: { in: ["new", "confirmed", "shipped"] } } }),
    prisma.wholesaleEnquiry.count({ where: { customer_id: customerId } }),
    prisma.customerAddress.count({ where: { customer_id: customerId } }),
    prisma.retailOrder.findFirst({ where: { customer_id: customerId }, orderBy: { created_at: "desc" }, select: { order_number: true, status: true, subtotal: true, currency: true, created_at: true } }),
  ]);
  return { orders, openOrders, enquiries, addresses, recent };
}
