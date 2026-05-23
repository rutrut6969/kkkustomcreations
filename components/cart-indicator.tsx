"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { cartUpdatedEvent, getCart, getCartSummary, type CartItem } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

export function CartIndicator() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pulse, setPulse] = useState(false);
  const previousCount = useRef(0);
  const summary = useMemo(() => getCartSummary(items), [items]);

  useEffect(() => {
    const sync = () => {
      const next = getCart();
      const nextSummary = getCartSummary(next);
      if (previousCount.current !== nextSummary.itemCount) {
        setPulse(true);
        window.setTimeout(() => setPulse(false), 360);
      }
      previousCount.current = nextSummary.itemCount;
      setItems(next);
    };

    sync();
    window.addEventListener(cartUpdatedEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(cartUpdatedEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${summary.itemCount} items, ${formatMoney(summary.subtotalCents)}`}
      className={clsx(
        "focus-ring group inline-flex h-10 min-w-[5.75rem] items-center justify-center gap-1.5 rounded-full bg-boutique-pink px-3 text-sm font-black text-white shadow-pink transition hover:-translate-y-0.5 hover:bg-pink-500 sm:min-w-[8.25rem]",
        pulse && "cart-indicator-pulse"
      )}
    >
      <ShoppingBag size={18} aria-hidden="true" className="shrink-0" />
      <span className="tabular-nums">{summary.itemCount}</span>
      <span aria-hidden="true" className="text-white/75">·</span>
      <span className="min-w-[3.1rem] text-right text-[0.8rem] tabular-nums sm:min-w-[4.25rem] sm:text-sm">
        {formatMoney(summary.subtotalCents)}
      </span>
    </Link>
  );
}
