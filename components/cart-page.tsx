"use client";

import Image from "next/image";
import Link from "next/link";
import { CreditCard, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getCart,
  getCartSummary,
  notifyCartUpdated,
  saveCart,
  type CartItem,
} from "@/lib/cart";
import { formatMoney } from "@/lib/format";

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const subtotal = useMemo(() => getCartSummary(items).subtotalCents, [items]);

  useEffect(() => setItems(getCart()), []);

  function update(itemsNext: CartItem[]) {
    setItems(itemsNext);
    saveCart(itemsNext);
    notifyCartUpdated();
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-boutique border border-pink-100 bg-white p-8 text-center shadow-soft">
            <p className="text-xl font-black">Your cart is empty.</p>
            <Link
              href="/shop"
              className="mt-4 inline-flex rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink"
            >
              Shop products
            </Link>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.productId}
            className="grid grid-cols-[86px_1fr] gap-4 rounded-boutique border border-pink-100 bg-white p-4 shadow-soft"
          >
            <div className="relative aspect-square overflow-hidden rounded-xl bg-aqua-50">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="86px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <Link
                href={`/shop/${item.slug}`}
                className="font-black hover:text-boutique-pink"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-sm text-boutique-charcoal/65">
                {formatMoney(item.priceCents)} each
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-full border border-pink-100 bg-boutique-blush">
                  <button
                    aria-label="Decrease quantity"
                    className="grid h-9 w-9 place-items-center"
                    onClick={() =>
                      update(
                        items.map((cartItem) =>
                          cartItem.productId === item.productId
                            ? {
                                ...cartItem,
                                quantity: Math.max(1, cartItem.quantity - 1),
                              }
                            : cartItem,
                        ),
                      )
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center text-sm font-black">
                    {item.quantity}
                  </span>
                  <button
                    aria-label="Increase quantity"
                    className="grid h-9 w-9 place-items-center"
                    onClick={() =>
                      update(
                        items.map((cartItem) =>
                          cartItem.productId === item.productId
                            ? { ...cartItem, quantity: cartItem.quantity + 1 }
                            : cartItem,
                        ),
                      )
                    }
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  aria-label="Remove item"
                  className="grid h-9 w-9 place-items-center rounded-full text-boutique-pink hover:bg-boutique-blush"
                  onClick={() =>
                    update(
                      items.filter(
                        (cartItem) => cartItem.productId !== item.productId,
                      ),
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-boutique border border-pink-100 bg-white p-5 shadow-pink">
        <h2 className="text-2xl font-black">Order summary</h2>
        <div className="mt-4 flex items-center justify-between border-b border-pink-100 pb-4">
          <span className="font-bold">Subtotal</span>
          <span className="text-xl font-black">{formatMoney(subtotal)}</span>
        </div>
        <div className="mt-5 grid gap-3">
          <p className="rounded-2xl bg-aqua-50 p-3 text-sm font-bold leading-6 text-boutique-charcoal/70">
            Customer info, fulfillment, consent, and payment are collected once on the secure checkout screen.
          </p>
          <Link
            href="/checkout"
            aria-disabled={items.length === 0}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-boutique-pink px-5 py-3 font-black text-white shadow-pink aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <CreditCard size={18} aria-hidden="true" />
            Pay Now!
          </Link>
        </div>
      </aside>
    </div>
  );
}
