import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product.category.slug, product.slug);
  const unavailable = product.availability === "OUT_OF_STOCK";

  return (
    <section className="container-page py-8">
      <Link href="/shop" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-boutique-pink">
        <ArrowLeft size={16} /> Back to shop
      </Link>
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div className="relative aspect-square overflow-hidden rounded-boutique bg-aqua-50 shadow-soft">
          <Image src={product.imageUrl} alt={product.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="rounded-boutique border border-pink-100 bg-white p-6 shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">{product.category.name}</p>
          <h1 className="mt-2 text-4xl font-black">{product.name}</h1>
          <p className="mt-3 text-2xl font-black text-boutique-pink">{formatMoney(product.priceCents)}</p>
          <p className="mt-5 leading-8 text-boutique-charcoal/75">{product.description}</p>
          <div className="mt-5 rounded-boutique bg-boutique-blush p-4 text-sm leading-6">
            <p><span className="font-black">Availability:</span> {product.availability.replaceAll("_", " ").toLowerCase()}</p>
            <p><span className="font-black">Stock:</span> {product.availability === "MADE_TO_ORDER" ? "Made after checkout" : product.stock}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton product={product} disabled={unavailable} />
            <Link href="/custom-orders" className="focus-ring rounded-full border-2 border-aqua-300 bg-white px-5 py-3 text-sm font-black shadow-soft">
              Ask about customizing
            </Link>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-5 text-2xl font-black">More in {product.category.name}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </div>
      )}
    </section>
  );
}
