import { CardPreview } from "@/components/admin/card-preview";
import { ProductEditor } from "@/components/admin/product-editor";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Alert } from "@/components/ui/primitives";
import { getStaffSession } from "@/lib/auth/staff";
import { saveProduct } from "../actions";
import { categoryOptions } from "../shared";

export default async function NewProductPage() {
  const session = await getStaffSession();
  if (!session?.isAdmin) return <Alert tone="warning" title="Administrator access is required to add products." />;
  const categories = await categoryOptions();
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title="New product" description="Add the details and photos, then publish when it is ready." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <ProductEditor action={saveProduct.bind(null, null)} product={null} categories={categories} isNew />
        </Panel>
        <Panel title="Card preview">
          <CardPreview initial={{ name: "", fabric: "", description: "", categoryId: "", price: "", quoteEnabled: true, retailEnabled: false }} images={[]} categories={categories.map((c) => ({ id: c.id, name: c.label.split(" › ").pop() ?? c.label, slug: "" }))} />
        </Panel>
      </div>
    </>
  );
}
