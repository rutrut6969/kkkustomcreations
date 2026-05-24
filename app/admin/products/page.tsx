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
  ["low-stock", "Low Stock"],
  ["out-of-stock", "Out of Stock"],
  ["synced", "Synced"],
  ["not-synced", "Not Synced"]
];

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`form-label ${className ?? ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ProductSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-aqua-700">{title}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function ProductFields({ categories, product }: { categories: Awaited<ReturnType<typeof getAdminCategories>>; product?: any }) {
  return (
    <>
      {product && <input type="hidden" name="id" value={product.id} />}
      <ProductSection title="Basic Info">
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Product name">
            <input name="name" defaultValue={product?.name ?? ""} placeholder="Pink glitter tumbler" className="form-control" required />
          </Field>
          <Field label="Slug">
            <input name="slug" defaultValue={product?.slug ?? ""} placeholder="Auto-generated when blank" className="form-control" />
          </Field>
          <Field label="Category">
            <select name="categoryId" className="form-control" defaultValue={product?.categoryId ?? ""} required>
              <option value="">Choose category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Product status">
            <select name="status" className="form-control" defaultValue={product?.status ?? "ACTIVE"}>
              {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Short description">
          <input name="shortDescription" defaultValue={product?.shortDescription ?? ""} placeholder="One-line customer-facing summary" className="form-control" />
        </Field>
        <Field label="Long description">
          <textarea name="description" rows={4} defaultValue={product?.description ?? ""} placeholder="Materials, sizing, custom details, care notes" className="form-control" required />
        </Field>
      </ProductSection>

      <ProductSection title="Pricing">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Price">
            <input name="price" inputMode="decimal" defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""} placeholder="25.00" className="form-control" required />
          </Field>
          <Field label="Sale price">
            <input name="salePrice" inputMode="decimal" defaultValue={product?.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : ""} placeholder="Optional" className="form-control" />
          </Field>
        </div>
      </ProductSection>

      <ProductSection title="Inventory">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Stock quantity">
            <input name="stock" type="number" min="0" defaultValue={product?.stock ?? ""} placeholder="10" className="form-control" />
          </Field>
          <Field label="Availability">
            <select name="availability" className="form-control" defaultValue={product?.availability ?? "IN_STOCK"}>
              {availabilityStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          <label className="flex items-center gap-2"><input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-boutique-pink" /> Featured</label>
          <label className="flex items-center gap-2"><input name="trackQuantity" type="checkbox" defaultChecked={product ? !product.madeToOrder : true} className="h-4 w-4 accent-boutique-pink" /> Track quantity</label>
          <label className="flex items-center gap-2"><input name="madeToOrder" type="checkbox" defaultChecked={product?.madeToOrder ?? false} className="h-4 w-4 accent-boutique-pink" /> Always available / made to order</label>
        </div>
        <p className="text-xs font-bold leading-5 text-boutique-charcoal/55">
          Use Track quantity for stocked Square inventory. Use Always available for custom or made-to-order items that should not decrement after checkout.
        </p>
      </ProductSection>

      <ProductSection title="Media">
        <Field label="Upload primary image">
          <input name="primaryImageFile" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="form-control" />
        </Field>
        <Field label="Upload gallery images">
          <input name="galleryImages" type="file" accept="image/jpeg,image/png,image/webp" multiple className="form-control" />
        </Field>
        <Field label="Manual image URL fallback">
          <input name="imageUrl" defaultValue={product?.imageUrl ?? ""} placeholder="https://..." className="form-control" />
        </Field>
      </ProductSection>

      <ProductSection title="SEO">
        <Field label="Tags">
          <input name="tags" defaultValue={product?.tags?.join(", ") ?? ""} placeholder="tumblers, pink, glitter" className="form-control" />
        </Field>
        <Field label="Meta description">
          <input name="metaDescription" defaultValue={product?.metaDescription ?? ""} placeholder="Short search/social summary" className="form-control" />
        </Field>
      </ProductSection>

      <ProductSection title="Square Sync">
        <div className="grid gap-3 text-sm font-bold text-boutique-charcoal/70 md:grid-cols-2">
          <p>Catalog ID: {product?.squareCatalogId ?? "Not linked yet"}</p>
          <p>Status: {product?.syncStatus?.replaceAll("_", " ") ?? "Not synced"}</p>
          <p>Last sync: {product?.lastSyncedAt ? product.lastSyncedAt.toLocaleString() : "Not synced"}</p>
          <p>Inventory sync: {product?.inventorySyncStatus?.replaceAll("_", " ") ?? "Not synced"}</p>
        </div>
      </ProductSection>

      {!product && (
        <ProductSection title="Variants">
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Variant name">
              <input name="variantName" placeholder="Color" className="form-control" />
            </Field>
            <Field label="Variant value">
              <input name="variantValue" placeholder="Aqua" className="form-control" />
            </Field>
          </div>
        </ProductSection>
      )}
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
                    <p className="text-sm text-boutique-charcoal/60">
                      {product.category.name} - {formatMoney(product.salePriceCents ?? product.priceCents)} - {product.madeToOrder ? "always available" : `stock ${product.stock}`}
                    </p>
                    <p className="mt-1 text-xs font-bold text-boutique-charcoal/45">
                      Square: {product.squareCatalogId ?? "not linked"} {product.lastSyncedAt ? `- synced ${product.lastSyncedAt.toLocaleString()}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-bold text-boutique-charcoal/45">
                      Inventory: {product.inventorySyncedAt ? `synced ${product.inventorySyncedAt.toLocaleString()}` : "not synced"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.featured && <StatusPill tone="pink">Featured</StatusPill>}
                    {product.madeToOrder && <StatusPill tone="aqua">Always available</StatusPill>}
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
