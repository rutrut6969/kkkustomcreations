import { AdminPageHeader } from "@/components/admin/admin-ui";
import { QuickAddProduct } from "@/components/admin/quick-add-product";

export const dynamic = "force-dynamic";

export default function AdminQuickAddPage() {
  return (
    <div>
      <AdminPageHeader title="Quick Add Product" eyebrow="AI assisted" description="Upload a product photo, review an editable draft, then publish only when it looks right." />
      <QuickAddProduct />
    </div>
  );
}
