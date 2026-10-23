import { z } from "zod";
import { getStaffSession } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

/** Staff-only download of a private enquiry attachment. */
export async function GET(_request: Request, ctx: RouteContext<"/admin/attachments/[id]">) {
  if (!(await getStaffSession())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const a = await prisma.enquiryAttachment.findUnique({ where: { id } });
  const bytes = a && (await readStoredFile("attachments", a.storage_path));
  if (!a || !bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": a.content_type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.original_filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
