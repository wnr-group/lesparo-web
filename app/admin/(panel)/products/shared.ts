import "server-only";
import { requestDb } from "@/lib/db";

/** Category options labelled with their path, e.g. "Garments › Gents › Shorts". */
export async function categoryOptions() {
  const db = await requestDb();
  const all = await db.category.findMany({ select: { id: true, name: true, parent_id: true }, orderBy: { display_order: "asc" } });
  const label = (id: string): string => {
    const c = all.find((x) => x.id === id)!;
    return c.parent_id ? `${label(c.parent_id)} › ${c.name}` : c.name;
  };
  return all.map((c) => ({ id: c.id, label: label(c.id) }));
}
