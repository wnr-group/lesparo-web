import { notFound } from "next/navigation";
import { z } from "zod";
import { CategoryEditor } from "@/components/admin/category-editor";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Alert } from "@/components/ui/primitives";
import { getStaffSession } from "@/lib/auth/staff";
import { createClient, publicMediaUrl } from "@/lib/supabase/server";
import { categoryOptions } from "../../products/shared";
import { saveCategory } from "../actions";

/** Handles both /admin/categories/new and /admin/categories/<id>. */
export default async function CategoryPage(props: PageProps<"/admin/categories/[id]">) {
  const { id } = await props.params;
  const isNew = id === "new";
  if (!isNew && !z.uuid().safeParse(id).success) notFound();
  const session = await getStaffSession();
  if (!session?.isAdmin) return <Alert tone="warning" title="Administrator access is required to manage categories." />;

  const db = await createClient();
  const { data: c } = isNew ? { data: null } : await db.from("categories").select("*").eq("id", id).maybeSingle();
  if (!isNew && !c) notFound();
  const parents = (await categoryOptions()).filter((p) => p.id !== id);

  return (
    <>
      <PageHeader back={{ href: "/admin/categories", label: "Categories" }} title={c?.name ?? "New category"} />
      <Panel>
        <CategoryEditor
          action={saveCategory.bind(null, isNew ? null : id)}
          parents={parents}
          category={
            c && {
              name: c.name,
              slug: c.slug,
              parentId: c.parent_id,
              description: c.description,
              displayOrder: c.display_order,
              isPublished: c.is_published,
              isFeatured: c.is_featured,
              coverUrl: publicMediaUrl(c.cover_image_path),
            }
          }
        />
      </Panel>
    </>
  );
}
