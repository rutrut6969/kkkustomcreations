import Image from "next/image";
import { archiveProduct, deleteProductImage, saveProduct } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminCategories, getAdminProducts } from "@/lib/admin-data";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const productStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"];
const availabilityStatuses = ["IN_STOCK", "LOW_STOCK", "MADE_TO_ORDER", "OUT_OF_STOCK"];

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getAdminProducts(), getAdminCategories()]);

  return (
    <div>
      <AdminPageHeader title="Products" eyebrow="Catalog" description="Create, edit, archive, feature, and prepare items for future Square catalog sync." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <AdminForm action={saveProduct} submitLabel="Create product">
          <h2 className="font-black">New product</h2>
          <input aria-label="Product name" name="name" placeholder="Product name" className="form-control" />
          <input aria-label="Product slug" name="slug" placeholder="Slug optional" className="form-control" />
          <select aria-label="Category" name="categoryId" className="form-control" required>
            <option value="">Choose category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Price" name="price" placeholder="Price, e.g. 32.00" className="form-control" />
            <input aria-label="Sale price" name="salePrice" placeholder="Sale price optional" className="form-control" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Inventory stock" name="stock" type="number" min="0" placeholder="Stock" className="form-control" />
            <select aria-label="Availability" name="availability" className="form-control" defaultValue="IN_STOCK">
              {availabilityStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </div>
          <select aria-label="Product status" name="status" className="form-control" defaultValue="ACTIVE">
            {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input aria-label="Image URL" name="imageUrl" placeholder="Primary image URL" className="form-control" />
          <input aria-label="Tags" name="tags" placeholder="Tags, comma separated" className="form-control" />
          <input aria-label="Short description" name="shortDescription" placeholder="Short description" className="form-control" />
          <textarea aria-label="Description" name="description" rows={4} placeholder="Long description" className="form-control" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Variant name" name="variantName" placeholder="Variant name, e.g. Color" className="form-control" />
            <input aria-label="Variant value" name="variantValue" placeholder="Variant value, e.g. Aqua" className="form-control" />
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-bold">
            <label className="flex items-center gap-2"><input name="featured" type="checkbox" className="h-4 w-4 accent-boutique-pink" /> Featured</label>
            <label className="flex items-center gap-2"><input name="madeToOrder" type="checkbox" className="h-4 w-4 accent-boutique-pink" /> Made to order</label>
          </div>
        </AdminForm>

        <div className="space-y-3">
          {products.map((product) => (
            <AdminCard key={product.id} className="p-0">
              <details className="group">
                <summary className="grid cursor-pointer gap-3 p-4 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-aqua-50">
                    <Image src={product.imageUrl} alt={product.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-black">{product.name}</p>
                    <p className="text-sm text-boutique-charcoal/60">{product.category.name} · {formatMoney(product.salePriceCents ?? product.priceCents)} · stock {product.stock}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.featured && <StatusPill tone="pink">Featured</StatusPill>}
                    <StatusPill tone={product.status === "ACTIVE" ? "aqua" : "neutral"}>{product.status}</StatusPill>
                    <StatusPill>{product.availability.replaceAll("_", " ")}</StatusPill>
                  </div>
                </summary>
                <div className="border-t border-pink-100 p-4">
                  <AdminForm action={saveProduct} submitLabel="Save product">
                    <input type="hidden" name="id" value={product.id} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <input aria-label="Product name" name="name" defaultValue={product.name} className="form-control" />
                      <input aria-label="Product slug" name="slug" defaultValue={product.slug} className="form-control" />
                      <select aria-label="Category" name="categoryId" className="form-control" defaultValue={product.categoryId}>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                      <input aria-label="Price" name="price" defaultValue={(product.priceCents / 100).toFixed(2)} className="form-control" />
                      <input aria-label="Sale price" name="salePrice" defaultValue={product.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : ""} className="form-control" />
                      <input aria-label="Inventory stock" name="stock" type="number" defaultValue={product.stock} className="form-control" />
                      <select aria-label="Availability" name="availability" className="form-control" defaultValue={product.availability}>
                        {availabilityStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                      </select>
                      <select aria-label="Product status" name="status" className="form-control" defaultValue={product.status}>
                        {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <input aria-label="Image URL" name="imageUrl" defaultValue={product.imageUrl} className="form-control" />
                    <input aria-label="Tags" name="tags" defaultValue={product.tags?.join(", ")} className="form-control" />
                    <input aria-label="Short description" name="shortDescription" defaultValue={product.shortDescription ?? ""} className="form-control" />
                    <textarea aria-label="Description" name="description" rows={4} defaultValue={product.description} className="form-control" />
                    <div className="flex flex-wrap gap-4 text-sm font-bold">
                      <label className="flex items-center gap-2"><input name="featured" type="checkbox" defaultChecked={product.featured} className="h-4 w-4 accent-boutique-pink" /> Featured</label>
                      <label className="flex items-center gap-2"><input name="madeToOrder" type="checkbox" defaultChecked={product.madeToOrder} className="h-4 w-4 accent-boutique-pink" /> Made to order</label>
                    </div>
                  </AdminForm>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {product.images.map((image: { id: string; alt: string | null; url: string }) => (
                      <form key={image.id} action={deleteProductImage} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="truncate text-sm font-bold">{image.alt ?? image.url}</span>
                        <input type="hidden" name="id" value={image.id} />
                        <button className="text-sm font-black text-boutique-pink">Remove image</button>
                      </form>
                    ))}
                    {product.variants.map((variant: { id: string; name: string; value: string }) => (
                      <div key={variant.id} className="rounded-xl bg-aqua-50 p-3 text-sm">
                        <span className="font-black">{variant.name}:</span> {variant.value}
                      </div>
                    ))}
                  </div>
                  <form action={archiveProduct} className="mt-3">
                    <input type="hidden" name="id" value={product.id} />
                    <button className="text-sm font-black text-boutique-pink">Archive product</button>
                  </form>
                </div>
              </details>
            </AdminCard>
          ))}
        </div>
      </div>
    </div>
  );
}
