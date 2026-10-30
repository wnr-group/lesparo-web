import { getStaffSession } from "@/lib/auth/staff";
import { getAdminNotifications } from "@/lib/services/admin-notifications";

/** Polled by the admin bell. Staff only; nothing here is cacheable. */
export async function GET() {
  const session = await getStaffSession();
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return Response.json(await getAdminNotifications(), { headers: { "Cache-Control": "no-store" } });
}
