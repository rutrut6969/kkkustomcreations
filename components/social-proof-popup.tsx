"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { SocialProofView } from "@/lib/types";

export function SocialProofPopup({ purchases }: { purchases: SocialProofView[] }) {
  const [visibleItems, setVisibleItems] = useState<SocialProofView[]>([]);
  const items = useMemo(() => purchases.filter(Boolean), [purchases]);

  useEffect(() => {
    if (!items.length) return;
    let current = Math.floor(Math.random() * items.length);
    const show = () => {
      current = (current + 1 + Math.floor(Math.random() * Math.max(1, items.length - 1))) % items.length;
      const next = items[current];
      setVisibleItems((existing) => [next, ...existing.filter((item) => item.id !== next.id)].slice(0, 3));
      window.setTimeout(() => {
        setVisibleItems((existing) => existing.filter((item) => item.id !== next.id));
      }, 7200);
    };
    const initial = window.setTimeout(show, 4500 + Math.random() * 4500);
    const interval = window.setInterval(show, 22000 + Math.random() * 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [items]);

  if (!items.length || !visibleItems.length) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 grid max-w-[calc(100vw-1.5rem)] gap-2 sm:bottom-6 sm:left-6 sm:max-w-sm">
      {visibleItems.map((item) => {
        const href = item.productSlug ? `/shop/${item.productSlug}` : item.fallbackUrl ?? "/shop";
        return (
          <Link
            key={item.id}
            href={href}
            className="social-proof-enter flex cursor-pointer items-center gap-3 rounded-boutique border border-pink-100 bg-white p-3 pr-4 text-sm shadow-pink transition hover:-translate-y-1 hover:border-boutique-pink hover:shadow-soft focus-ring"
            title="View this product"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-aqua-100 text-boutique-pink">
              <Sparkles size={18} />
            </span>
            <span>
              <span className="font-black">{item.customerName}</span> just purchased a{" "}
              <span className="font-black text-boutique-pink">{item.productName}</span>.
              {item.isSample && <span className="block text-xs text-boutique-charcoal/55">Popular item</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
