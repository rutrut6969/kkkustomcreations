"use client";

import type { ProductView } from "@/lib/types";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
};

const key = "kk_cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

export function addCartItem(product: ProductView, quantity: number) {
  const items = getCart();
  const existing = items.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      quantity
    });
  }
  saveCart(items);
}

export function clearCart() {
  saveCart([]);
}
