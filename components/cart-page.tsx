"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clearCart, getCart, saveCart, type CartItem } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0), [items]);

  useEffect(() => setItems(getCart()), []);

  function update(itemsNext: CartItem[]) {
    setItems(itemsNext);
    saveCart(itemsNext);
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function checkout(formData: FormData) {
    setLoading(true);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        fulfillmentType: formData.get("fulfillmentType"),
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address1: formData.get("address1"),
        city: formData.get("city"),
        state: formData.get("state"),
        postalCode: formData.get("postalCode"),
        notes: formData.get("notes"),
        consent: formData.get("consent") === "on",
        marketingConsent: formData.get("marketingConsent") === "on"
      })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      alert(data.error ?? "Checkout could not be started.");
      return;
    }
    clearCart();
    window.location.href = data.url;
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-boutique border border-pink-100 bg-white p-8 text-center shadow-soft">
            <p className="text-xl font-black">Your cart is empty.</p>
            <Link href="/shop" className="mt-4 inline-flex rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink">
              Shop products
            </Link>
          </div>
        )}
        {items.map((item) => (
          <div key={item.productId} className="grid grid-cols-[86px_1fr] gap-4 rounded-boutique border border-pink-100 bg-white p-4 shadow-soft">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-aqua-50">
              <Image src={item.imageUrl} alt={item.name} fill sizes="86px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <Link href={`/shop/${item.slug}`} className="font-black hover:text-boutique-pink">{item.name}</Link>
              <p className="mt-1 text-sm text-boutique-charcoal/65">{formatMoney(item.priceCents)} each</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-full border border-pink-100 bg-boutique-blush">
                  <button aria-label="Decrease quantity" className="grid h-9 w-9 place-items-center" onClick={() => update(items.map((cartItem) => cartItem.productId === item.productId ? { ...cartItem, quantity: Math.max(1, cartItem.quantity - 1) } : cartItem))}>
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                  <button aria-label="Increase quantity" className="grid h-9 w-9 place-items-center" onClick={() => update(items.map((cartItem) => cartItem.productId === item.productId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem))}>
                    <Plus size={15} />
                  </button>
                </div>
                <button aria-label="Remove item" className="grid h-9 w-9 place-items-center rounded-full text-boutique-pink hover:bg-boutique-blush" onClick={() => update(items.filter((cartItem) => cartItem.productId !== item.productId))}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form action={checkout} className="h-fit rounded-boutique border border-pink-100 bg-white p-5 shadow-pink">
        <h2 className="text-2xl font-black">Checkout details</h2>
        <div className="mt-4 flex items-center justify-between border-b border-pink-100 pb-4">
          <span className="font-bold">Subtotal</span>
          <span className="text-xl font-black">{formatMoney(subtotal)}</span>
        </div>
        <div className="mt-5 grid gap-3">
          <select name="fulfillmentType" required className="focus-ring rounded-xl border border-pink-100 px-4 py-3">
            <option value="SHIPPING">Shipping</option>
            <option value="PICKUP">Local pickup</option>
            <option value="DROPOFF">Local dropoff</option>
          </select>
          <input name="name" required placeholder="Name" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          <input name="email" type="email" required placeholder="Email" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          <input name="phone" required placeholder="Phone" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          <input name="address1" placeholder="Address for shipping/dropoff" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="city" placeholder="City" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
            <input name="state" placeholder="State" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
            <input name="postalCode" placeholder="ZIP" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          </div>
          <textarea name="notes" placeholder="Notes or customization details" rows={4} className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          <label className="flex gap-3 text-sm leading-6">
            <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-boutique-pink" />
            <span>I consent to K&K Kustom Kreations contacting me about my order, custom request, pickup/dropoff, and related business updates.</span>
          </label>
          <label className="flex gap-3 text-sm leading-6">
            <input name="marketingConsent" type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" />
            <span>I would like to receive updates about new products, events, and promotions.</span>
          </label>
          <button disabled={loading || items.length === 0} className="focus-ring rounded-full bg-boutique-pink px-5 py-3 font-black text-white shadow-pink disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Starting Square checkout..." : "Checkout with Square"}
          </button>
        </div>
      </form>
    </div>
  );
}
