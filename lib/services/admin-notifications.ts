import "server-only";
import { prisma } from "@/lib/db";

export type AdminNotifications = {
  /** Enquiries no staff member has opened yet. */
  count: number;
  /** The most recent of them, newest first. */
  items: { id: string; number: string; name: string; at: string }[];
};

/** What the admin bell shows: wholesale enquiries nobody has opened yet. Reads the live table, never the catalogue cache. */
export async function getAdminNotifications(): Promise<AdminNotifications> {
  const [count, latest] = await Promise.all([
    prisma.wholesaleEnquiry.count({ where: { admin_seen_at: null } }),
    prisma.wholesaleEnquiry.findMany({
      where: { admin_seen_at: null },
      select: { id: true, enquiry_number: true, customer_name: true, company_name: true, created_at: true },
      orderBy: { created_at: "desc" },
      take: 6,
    }),
  ]);
  return { count, items: latest.map((e) => ({ id: e.id, number: e.enquiry_number, name: e.company_name ?? e.customer_name, at: e.created_at.toISOString() })) };
}
