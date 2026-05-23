"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { SocialProofView } from "@/lib/types";

export function SocialProofPopup({ purchases }: { purchases: SocialProofView[] }) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const items = useMemo(() => purchases.filter(Boolean), [purchases]);

  useEffect(() => {
    if (!items.length) return;
    const show = () => {
      setIndex(Math.floor(Math.random() * items.length));
      setVisible(true);
      window.setTimeout(() => setVisible(false), 6200);
    };
    const initial = window.setTimeout(show, 4500 + Math.random() * 4500);
    const interval = window.setInterval(show, 22000 + Math.random() * 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [items]);

  if (!items.length || !visible) return null;

  const item = items[index];
  const href = item.productSlug ? `/shop/${item.productSlug}` : item.fallbackUrl ?? "/shop";

  return (
    <Link
      href={href}
      className="fixed bottom-3 left-3 z-50 flex max-w-[calc(100vw-1.5rem)] cursor-pointer items-center gap-3 rounded-boutique border border-pink-100 bg-white p-3 pr-4 text-sm shadow-pink transition hover:-translate-y-1 hover:border-boutique-pink hover:shadow-soft focus-ring sm:bottom-6 sm:left-6 sm:max-w-sm"
      title="View a similar product"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-aqua-100 text-boutique-pink">
        <Sparkles size={18} />
      </span>
      <span>
        <span className="font-black">{item.customerName}</span> just purchased a{" "}
        <span className="font-black text-boutique-pink">{item.productName}</span>.
        {item.isSample && <span className="block text-xs text-boutique-charcoal/55">Sample activity for Phase 1</span>}
      </span>
    </Link>
  );
}
