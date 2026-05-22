"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { ProductView } from "@/lib/types";
import { addCartItem } from "@/lib/cart";

export function AddToCartButton({
  product,
  disabled,
  children
}: {
  product: ProductView;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        addCartItem(product, 1);
        setAdded(true);
        window.dispatchEvent(new Event("cart-updated"));
        setTimeout(() => setAdded(false), 1600);
      }}
      className={clsx(
        "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition",
        disabled
          ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
          : "bg-aqua-300 text-boutique-charcoal shadow-soft hover:-translate-y-0.5"
      )}
    >
      {children}
      {disabled ? "Unavailable" : added ? "Added" : "Add"}
    </button>
  );
}
