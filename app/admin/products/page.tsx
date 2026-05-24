import Image from "next/image";
import Link from "next/link";
import {
  archiveProduct,
  archiveProductInSquareAction,
  deleteProductImage,
  permanentlyDeleteProduct,
  pushProductToSquareAction,
  restoreProduct,
  saveProduct,
  setPrimaryProductImage,
  syncProductInventoryAction
} from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminCategories, getAdminProducts } from "@/lib/admin-data";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const productStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"];
const availabilityStatuses = ["IN_STOCK", "LOW_STOCK", "MADE_TO_ORDER", "OUT_OF_STOCK"];
const filters = [
  ["active", "Active"],
  ["draft", "Draft"],
  ["archived", "Archived"],
  ["out-of-stock", "Out of Stock"],
  ["synced", "Synced"],
  ["not-synced", "Not Synced"]
];

function ProductFields({ categories, product }: { categories: Awaited<ReturnType<typeof getAdminCategories>>; product?: any }) {
  return (
    <>
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-3 lg:grid-cols-2">
        <input aria-label="Product name" name="name" defaultValue={product?.name ?? ""} placeholder="Product name" className="form-control" />
        <input aria-label="Product slug" name="slug" defaultValue={product?.slug ?? ""} placeholder="Slug optional" className="form-control" />
        <select aria-label="Category" name="categoryId" className="form-control" defaultValue={product?.categoryId ?? ""} required>
          <option value="">Choose category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input aria-label="Price" name="price" defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""} placeholder="Price, e.g. 32.00" className="form-control" />
        <input aria-label="Sale price" name="salePrice" defaultValue={product?.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : ""} placeholder="Sale price optional" className="form-control" />
        <input aria-label="Inventory stock" name="stock" type="number" min="0" defaultValue={product?.stock ?? ""} placeholder="Stock" className="form-control" />
        <select aria-label="Availability" name="availability" className="form-control" defaultValue={product?.availability ?? "IN_STOCK"}>
          {availabilityStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </select>
        <select aria-label="Product status" name="status" className="form-control" defaultValue={product?.status ?? "ACTIVE"}>
          {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      <label className="form-label">
        Upload primary image
        <input aria-label="Upload primary image" name="primaryImageFile" type="file" accept="image/jpeg,image/png,image/webp" className="form-control" />
      </label>
      <label className="form-label">
        Upload gallery images
        <input aria-label="Upload gallery images" name="galleryImages" type="file" accept="image/jpeg,image/png,image/webp" multiple className="form-control" />
      </label>
      <input aria-label="Image URL" name="imageUrl" defaultValue={product?.imageUrl ?? ""} placeholder="Manual image URL fallback" className="form-control" />
      <input aria-label="Tags" name="tags" defaultValue={product?.tags?.join(", ") ?? ""} placeholder="Tags, comma separated" className="form-control" />
      <input aria-label="Short description" name="shortDescription" defaultValue={product?.shortDescription ?? ""} placeholder="Short description" className="form-control" />
      <input aria-label="Meta description" name="metaDescription" defaultValue={product?.metaDescription ?? ""} placeholder="SEO/meta description" className="form-control" />
      <textarea aria-label="Description" name="description" rows={4} defaultValue={product?.description ?? ""} placeholder="Long description" className="form-control" />
      {!product && (
        <div className="grid gap-3 lg:grid-cols-2">
          <input aria-label="Variant name" name="variantName" placeholder="Variant name, e.g. Color" className="form-control" />
          <input aria-label="Variant value" name="variantValue" placeholder="Variant value, e.g. Aqua" className="form-control" />
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-sm font-bold">
        <label className="flex items-center gap-2"><input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-boutique-pink" /> Featured</label>
        <label className="flex items-center gap-2"><input name="madeToOrder" type="checkbox" defaultChecked={product?.madeToOrder ?? false} className="h-4 w-4 accent-boutique-pink" /> Made to order</label>
      </div>
    </>
  );
}

export default async function AdminProductsPage({ searchParams }: { searchParams?: { filter?: string } }) {
  const activeFilter = searchParams?.filter ?? "active";
  const [products, categories] = await Promise.all([getAdminProducts(activeFilter), getAdminCategories()]);

  return (
    <div>
      <AdminPageHeader title="Products" eyebrow="Catalog" description="Create, edit, upload images, archive, delete, and sync products with Square Catalog and Inventory." />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {filters.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/products?filter=${value}`}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${activeFilter === value ? "bg-boutique-pink text-white shadow-pink" : "bg-white text-boutique-charcoal shadow-soft"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <AdminForm action={saveProduct} submitLabel="Create product">
          <h2 className="font-black">New product</h2>
          <ProductFields categories={categories} />
        </AdminForm>

        <div className="space-y-3">
          {products.map((product) => (
            <AdminCard key={product.id} className="p-0">
              <details className="group">
                <summary className="grid cursor-pointer gap-3 p-4 md:grid-cols-[72px_1fr_auto] md:items-center">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-aqua-50">
                    <Image src={product.imageUrl} alt={product.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-black">{product.name}</p>
                    <p className="text-sm text-boutique-charcoal/60">{product.category.name} - {formatMoney(product.salePriceCents ?? product.priceCents)} - stock {product.stock}</p>
                    <p className="mt-1 text-xs font-bold text-boutique-charcoal/45">
                      Square: {product.squareCatalogId ?? "not linked"} {product.lastSyncedAt ? `- synced ${product.lastSyncedAt.toLocaleString()}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-bold text-boutique-charcoal/45">
                      Inventory: {product.inventorySyncedAt ? `synced ${product.inventorySyncedAt.toLocaleString()}` : "not synced"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.featured && <StatusPill tone="pink">Featured</StatusPill>}
                    <StatusPill tone={product.status === "ACTIVE" ? "aqua" : "neutral"}>{product.status}</StatusPill>
                    <StatusPill>{product.availability.replaceAll("_", " ")}</StatusPill>
                    <StatusPill tone={product.syncStatus === "SYNCED" ? "aqua" : product.syncStatus === "ERROR" ? "pink" : "neutral"}>{product.syncStatus.replaceAll("_", " ")}</StatusPill>
                    <StatusPill tone={product.inventorySyncStatus === "SYNCED" ? "aqua" : product.inventorySyncStatus === "ERROR" ? "pink" : "neutral"}>Inventory {product.inventorySyncStatus.replaceAll("_", " ")}</StatusPill>
                  </div>
                </summary>
                <div className="border-t border-pink-100 p-4">
                  {product.syncError && <p className="mb-4 rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-pink">Square sync error: {product.syncError}</p>}
                  {product.inventorySyncError && <p className="mb-4 rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-pink">Inventory sync note: {product.inventorySyncError}</p>}
                  <div className="mb-4 grid gap-3 rounded-2xl border border-aqua-100 bg-aqua-50/70 p-3 lg:grid-cols-3">
                    <AdminActionForm action={pushProductToSquareAction} label="Push to Square" tone="pink"><input type="hidden" name="id" value={product.id} /></AdminActionForm>
                    <AdminActionForm action={syncProductInventoryAction} label="Sync inventory" tone="aqua"><input type="hidden" name="id" value={product.id} /></AdminActionForm>
                    <AdminActionForm action={archiveProductInSquareAction} label="Archive in Square" tone="neutral"><input type="hidden" name="id" value={product.id} /></AdminActionForm>
                  </div>
                  <AdminForm action={saveProduct} submitLabel="Save product">
                    <ProductFields categories={categories} product={product} />
                  </AdminForm>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {product.images.map((image: { id: string; alt: string | null; url: string }) => (
                      <div key={image.id} className="overflow-hidden rounded-2xl border border-pink-100 bg-white">
                        <div className="relative aspect-[4/3] bg-aqua-50">
                          <Image src={image.url} alt={image.alt ?? product.name} fill sizes="220px" className="object-cover" />
                        </div>
                        <div className="grid gap-2 p-3">
                          <p className="truncate text-sm font-bold">{image.alt ?? image.url}</p>
                          <form action={setPrimaryProductImage}><input type="hidden" name="id" value={image.id} /><button className="w-full rounded-full bg-aqua-50 px-3 py-2 text-xs font-black text-aqua-700">Set primary</button></form>
                          <form action={deleteProductImage}><input type="hidden" name="id" value={image.id} /><button className="w-full rounded-full bg-boutique-blush px-3 py-2 text-xs font-black text-boutique-pink">Remove image</button></form>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {product.variants.map((variant: { id: string; name: string; value: string }) => (
                      <div key={variant.id} className="rounded-xl bg-aqua-50 p-3 text-sm"><span className="font-black">{variant.name}:</span> {variant.value}</div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 rounded-2xl border border-pink-100 bg-zinc-50 p-3 md:grid-cols-3">
                    {product.status === "ARCHIVED" ? (
                      <form action={restoreProduct}><input type="hidden" name="id" value={product.id} /><button className="w-full rounded-full bg-aqua-50 px-4 py-2 text-sm font-black text-aqua-700">Restore product</button></form>
                    ) : (
                      <form action={archiveProduct}><input type="hidden" name="id" value={product.id} /><button className="w-full rounded-full bg-boutique-blush px-4 py-2 text-sm font-black text-boutique-pink">Archive product</button></form>
                    )}
                    <form action={permanentlyDeleteProduct} className="grid gap-2 md:col-span-2">
                      <input type="hidden" name="id" value={product.id} />
                      <label className="flex items-start gap-2 text-xs font-bold text-boutique-charcoal/70"><input name="confirmDelete" type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" /> Confirm permanent delete, including products tied to paid order history.</label>
                      <button className="w-full rounded-full bg-boutique-charcoal px-4 py-2 text-sm font-black text-white">Permanently delete</button>
                    </form>
                  </div>
                </div>
              </details>
            </AdminCard>
          ))}
          {products.length === 0 && <AdminCard><p className="text-sm font-bold text-boutique-charcoal/60">No products match this filter.</p></AdminCard>}
        </div>
      </div>
    </div>
  );
}
