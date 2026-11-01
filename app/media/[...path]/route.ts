import { publicMediaUrl } from "@/lib/storage";

/** Old /media/... links (from when images lived on local disk) now point at the public Supabase Storage URL. */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const url = publicMediaUrl(path.join("/"));
  if (!url) return new Response("Not found", { status: 404 });
  return Response.redirect(url, 308);
}
