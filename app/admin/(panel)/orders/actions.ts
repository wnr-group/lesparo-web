"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/validation/order";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const schema = z.object({ status: z.enum(ORDER_STATUSES), paymentStatus: z.enum(PAYMENT_STATUSES) });

export async function updateOrder(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requireStaff();
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return { error: "Choose a valid status." };
    await prisma.retailOrder.update({ where: { id: z.uuid().parse(id) }, data: { status: parsed.data.status, payment_status: parsed.data.paymentStatus } });
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error("[admin/orders]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
