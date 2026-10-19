import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Category options labelled with their path, e.g. "Garments › Gents › Shorts". */
export async function categoryOptions() {
  const db = await createClient();
  const { data } = await db.from("categories").select("id, name, parent_id").order("display_order");
  const all = data ?? [];
  const label = (id: string): string => {
    const c = all.find((x) => x.id === id)!;
    return c.parent_id ? `${label(c.parent_id)} › ${c.name}` : c.name;
  };
  return all.map((c) => ({ id: c.id, label: label(c.id) }));
}
