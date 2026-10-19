import { ProductEditor } from "@/components/admin/product-editor";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Alert } from "@/components/ui/primitives";
import { getStaffSession } from "@/lib/auth/staff";
import { saveProduct } from "../actions";
import { categoryOptions } from "../shared";

export default async function NewProductPage() {
  const session = await getStaffSession();
  if (!session?.isAdmin) return <Alert tone="warning" title="Administrator access is required to add products." />;
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title="New product" description="Save first, then add images." />
      <Panel>
        <ProductEditor action={saveProduct.bind(null, null)} product={null} categories={await categoryOptions()} isNew />
      </Panel>
    </>
  );
}
