import { saveFeaturedProducts, saveSettings } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-ui";
import { getFeaturedProducts, getProducts, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  const [settings, products, featured] = await Promise.all([getSettings(), getProducts(), getFeaturedProducts()]);
  return (
    <div>
      <AdminPageHeader title="Homepage Settings" eyebrow="Storefront" description="Control hero copy, featured product selections, and custom order visibility." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <AdminForm action={saveSettings} submitLabel="Save homepage settings">
          <input type="hidden" name="settingsKeys" value="homepageBannerText,customOrdersEnabled" />
          <label className="form-label">Homepage banner text
            <textarea name="homepageBannerText" rows={4} defaultValue={settings.homepageBannerText} className="form-control" />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input name="customOrdersEnabled" type="checkbox" defaultChecked={settings.customOrdersEnabled !== "false"} className="h-4 w-4 accent-boutique-pink" />
            Custom orders visible/open
          </label>
        </AdminForm>
        <form action={saveFeaturedProducts} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
          <h2 className="font-black">Featured products</h2>
          <p className="mt-1 text-sm text-boutique-charcoal/60">Currently featured: {featured.length}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {products.map((product) => (
              <label key={product.id} className="flex items-center gap-2 rounded-xl bg-zinc-50 p-3 text-sm font-bold">
                <input type="checkbox" name="featured" value={product.id} defaultChecked={product.featured} className="h-4 w-4 accent-boutique-pink" />
                {product.name}
              </label>
            ))}
          </div>
          <button className="focus-ring mt-4 rounded-xl bg-boutique-pink px-4 py-2 text-sm font-black text-white">Save featured products</button>
        </form>
      </div>
      <AdminCard className="mt-5">
        <p className="text-sm text-boutique-charcoal/65">Announcements are managed in the Announcements section and appear above the homepage hero.</p>
      </AdminCard>
    </div>
  );
}
