import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { ProductView } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/add-to-cart-button";

const availabilityCopy: Record<ProductView["availability"], string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  MADE_TO_ORDER: "Made to order",
  OUT_OF_STOCK: "Out of stock"
};

export function ProductCard({ product }: { product: ProductView }) {
  return (
    <article className="overflow-hidden rounded-boutique border border-pink-100 bg-white shadow-soft">
      <Link href={`/shop/${product.slug}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-aqua-50">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-xs font-black text-boutique-charcoal shadow-pink backdrop-blur">
            {product.category.name}
          </span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <Link href={`/shop/${product.slug}`} className="text-lg font-black hover:text-boutique-pink">
            {product.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-boutique-charcoal/70">{product.description}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black">{formatMoney(product.priceCents)}</p>
            <p className="text-xs font-bold text-aqua-700">{availabilityCopy[product.availability]}</p>
          </div>
          <AddToCartButton product={product} disabled={product.availability === "OUT_OF_STOCK"}>
            <ShoppingBag size={16} />
          </AddToCartButton>
        </div>
      </div>
    </article>
  );
}
