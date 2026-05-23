import { archiveCategoryInSquareAction, deleteCategory, pushCategoryToSquareAction, saveCategory } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminCategories } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div>
      <AdminPageHeader title="Categories" eyebrow="Catalog structure" description="Manage shop categories, visibility, ordering, Square IDs, and product/category relationships." />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <AdminForm action={saveCategory} submitLabel="Create category">
          <h2 className="font-black">New category</h2>
          <input aria-label="Category name" name="name" placeholder="Category name" className="form-control" />
          <input aria-label="Category slug" name="slug" placeholder="Slug optional" className="form-control" />
          <textarea aria-label="Category description" name="description" rows={3} placeholder="Description" className="form-control" />
          <input aria-label="Banner image URL" name="bannerImageUrl" placeholder="Banner image URL" className="form-control" />
          <input aria-label="Sort order" name="sortOrder" type="number" placeholder="Sort order" className="form-control" />
          <label className="flex items-center gap-2 text-sm font-bold"><input name="visible" type="checkbox" defaultChecked className="h-4 w-4 accent-boutique-pink" /> Visible</label>
        </AdminForm>
        <div className="grid gap-3">
          {categories.map((category) => (
            <AdminCard key={category.id} className="p-0">
              <details>
                <summary className="grid cursor-pointer gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-black">{category.name}</p>
                    <p className="text-sm text-boutique-charcoal/60">{category.slug} - {category._count.products} products</p>
                    <p className="mt-1 text-xs font-bold text-boutique-charcoal/45">
                      Square: {category.squareCatalogId ?? "not linked"} {category.lastSyncedAt ? `- synced ${category.lastSyncedAt.toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone={category.visible ? "aqua" : "neutral"}>{category.visible ? "Visible" : "Hidden"}</StatusPill>
                    <StatusPill>Order {category.sortOrder}</StatusPill>
                    <StatusPill tone={category.syncStatus === "SYNCED" ? "aqua" : category.syncStatus === "ERROR" ? "pink" : "neutral"}>{category.syncStatus.replaceAll("_", " ")}</StatusPill>
                  </div>
                </summary>
                <div className="border-t border-pink-100 p-4">
                  {category.syncError && (
                    <p className="mb-4 rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-pink">
                      Square sync note: {category.syncError}
                    </p>
                  )}
                  <div className="mb-4 grid gap-3 rounded-2xl border border-aqua-100 bg-aqua-50/70 p-3 md:grid-cols-2">
                    <AdminActionForm action={pushCategoryToSquareAction} label="Push category to Square" tone="pink">
                      <input type="hidden" name="id" value={category.id} />
                    </AdminActionForm>
                    <AdminActionForm action={archiveCategoryInSquareAction} label="Hide/archive category" tone="neutral">
                      <input type="hidden" name="id" value={category.id} />
                    </AdminActionForm>
                  </div>
                  <AdminForm action={saveCategory} submitLabel="Save category">
                    <input type="hidden" name="id" value={category.id} />
                    <input aria-label="Category name" name="name" defaultValue={category.name} className="form-control" />
                    <input aria-label="Category slug" name="slug" defaultValue={category.slug} className="form-control" />
                    <textarea aria-label="Category description" name="description" rows={3} defaultValue={category.description ?? ""} className="form-control" />
                    <input aria-label="Banner image URL" name="bannerImageUrl" defaultValue={category.bannerImageUrl ?? ""} className="form-control" />
                    <input aria-label="Sort order" name="sortOrder" type="number" defaultValue={category.sortOrder} className="form-control" />
                    <label className="flex items-center gap-2 text-sm font-bold"><input name="visible" type="checkbox" defaultChecked={category.visible} className="h-4 w-4 accent-boutique-pink" /> Visible</label>
                  </AdminForm>
                  {category._count.products === 0 && (
                    <form action={deleteCategory} className="mt-3">
                      <input type="hidden" name="id" value={category.id} />
                      <button className="text-sm font-black text-boutique-pink">Delete local category</button>
                    </form>
                  )}
                </div>
              </details>
            </AdminCard>
          ))}
        </div>
      </div>
    </div>
  );
}
