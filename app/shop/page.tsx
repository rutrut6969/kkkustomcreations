import { getCategories, getProducts } from "@/lib/data";
import { ShopBrowser } from "@/components/shop-browser";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <section className="container-page py-10">
      <div className="mb-7 max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Shop</p>
        <h1 className="text-4xl font-black">Ready-made sparkle and custom favorites</h1>
        <p className="mt-3 leading-7 text-boutique-charcoal/75">
          Browse handmade cups, tumblers, pens, keychains, badge reels, wristlets, seasonal pieces, and custom starters.
        </p>
      </div>
      <ShopBrowser products={products} categories={categories} />
    </section>
  );
}
