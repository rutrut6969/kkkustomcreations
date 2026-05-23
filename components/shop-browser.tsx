"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CategoryView, ProductView } from "@/lib/types";
import { ProductCard } from "@/components/product-card";

export function ShopBrowser({ products, categories }: { products: ProductView[]; categories: CategoryView[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(() => {
    const requested = searchParams.get("category");
    return categories.some((item) => item.slug === requested) ? requested ?? "all" : "all";
  });

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category.slug === category;
      const text = `${product.name} ${product.description} ${product.category.name}`.toLowerCase();
      return matchesCategory && text.includes(query.toLowerCase());
    });
  }, [products, category, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-boutique border border-pink-100 bg-white p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-boutique-charcoal/45" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cups, pens, badge reels..."
              className="focus-ring w-full rounded-full border border-pink-100 bg-boutique-blush py-3 pl-11 pr-4"
            />
          </label>
          <select
            aria-label="Filter products by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="focus-ring w-full rounded-full border border-pink-100 bg-white px-4 py-3 font-bold md:w-auto"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!filtered.length && (
        <div className="rounded-boutique border border-pink-100 bg-white p-8 text-center shadow-soft">
          <p className="font-black">No products matched that search.</p>
          <p className="mt-2 text-sm text-boutique-charcoal/70">Try another category or message us about a custom order.</p>
        </div>
      )}
    </div>
  );
}
