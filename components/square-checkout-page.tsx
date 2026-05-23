"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { clearCart, getCart, getCartSummary, type CartItem } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

type SquareConfig = {
  environment: "sandbox" | "production";
  applicationId: string;
  locationId: string;
  sdkUrl: string;
};

type SquareCard = {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: { message?: string; detail?: string }[] }>;
  destroy?(): Promise<boolean>;
};

type SquareAfterpay = {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: { message?: string; detail?: string }[] }>;
  destroy?(): Promise<boolean>;
};

declare global {
  interface Window {
    Square?: {
      payments(applicationId: string, locationId: string): {
        card(): Promise<SquareCard>;
        paymentRequest(options: unknown): unknown;
        afterpayClearpay(paymentRequest: unknown): Promise<SquareAfterpay>;
        verifyBuyer?(token: string, details: unknown): Promise<{ token?: string }>;
      };
    };
  }
}

function loadSquareScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.Square) resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Square Web Payments.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Square Web Payments."));
    document.head.appendChild(script);
  });
}

function errorText(errors?: { message?: string; detail?: string }[]) {
  return errors?.map((error) => error.message ?? error.detail).filter(Boolean).join(" ") || "Square could not tokenize this payment method.";
}

export function SquareCheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState("SHIPPING");
  const [afterpayReady, setAfterpayReady] = useState(false);
  const cardRef = useRef<SquareCard | null>(null);
  const afterpayRef = useRef<SquareAfterpay | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const paymentsRef = useRef<ReturnType<NonNullable<typeof window.Square>["payments"]> | null>(null);
  const summary = useMemo(() => getCartSummary(items), [items]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const response = await fetch("/api/square/config");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Square checkout is not configured.");
        if (cancelled) return;
        setConfig(data);
        await loadSquareScript(data.sdkUrl);
        if (!window.Square) throw new Error("Square Web Payments did not initialize.");
        const payments = window.Square.payments(data.applicationId, data.locationId);
        paymentsRef.current = payments;
        const card = await payments.card();
        await card.attach("#square-card-container");
        cardRef.current = card;
        setReady(true);

        try {
          const request = payments.paymentRequest({
            countryCode: "US",
            currencyCode: "USD",
            total: { amount: (summary.subtotalCents / 100).toFixed(2), label: "K&K Kustom Kreations order" },
            requestShippingContact: fulfillmentType === "SHIPPING"
          });
          const afterpay = await payments.afterpayClearpay(request);
          await afterpay.attach("#square-afterpay-container");
          afterpayRef.current = afterpay;
          setAfterpayReady(true);
        } catch {
          setAfterpayReady(false);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Square checkout is not available.");
      }
    }
    boot();
    return () => {
      cancelled = true;
      void cardRef.current?.destroy?.();
      void afterpayRef.current?.destroy?.();
    };
  }, [fulfillmentType, summary.subtotalCents]);

  async function submitPayment(event: FormEvent, paymentMethod: "card" | "afterpay_clearpay") {
    event.preventDefault();
    if (!formRef.current) return;
    if (!items.length) {
      setMessage("Your cart is empty.");
      return;
    }
    const formData = new FormData(formRef.current);
    const paymentSource = paymentMethod === "afterpay_clearpay" ? afterpayRef.current : cardRef.current;
    if (!paymentSource) {
      setMessage(paymentMethod === "afterpay_clearpay" ? "Afterpay/Clearpay is not available for this cart." : "Square card form is still loading.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const tokenResult = await paymentSource.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) throw new Error(errorText(tokenResult.errors));
      let verificationToken: string | undefined;
      if (paymentMethod === "card" && paymentsRef.current?.verifyBuyer) {
        try {
          const verification = await paymentsRef.current.verifyBuyer(tokenResult.token, {
            amount: (summary.subtotalCents / 100).toFixed(2),
            billingContact: {
              givenName: String(formData.get("name") ?? ""),
              email: String(formData.get("email") ?? ""),
              phone: String(formData.get("phone") ?? ""),
              addressLines: [String(formData.get("address1") ?? "")],
              city: String(formData.get("city") ?? ""),
              state: String(formData.get("state") ?? ""),
              postalCode: String(formData.get("postalCode") ?? ""),
              countryCode: "US"
            },
            currencyCode: "USD",
            intent: "CHARGE"
          });
          verificationToken = verification.token;
        } catch {
          verificationToken = undefined;
        }
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          verificationToken,
          paymentMethod,
          items,
          fulfillmentType,
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
      if (!response.ok) throw new Error(data.error ?? "Payment could not be completed.");
      clearCart();
      window.location.href = `/checkout/success?paymentId=${encodeURIComponent(data.paymentId)}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be completed.");
      setLoading(false);
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-boutique border border-pink-100 bg-white p-8 text-center shadow-soft">
        <p className="text-xl font-black">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-flex rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink">
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={(event) => submitPayment(event, "card")} className="grid gap-7 lg:grid-cols-[1fr_420px]">
      <section className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-black">Order details</h2>
        <div className="mt-5 grid gap-3">
          <label className="form-label">
            Fulfillment
            <select name="fulfillmentType" required value={fulfillmentType} onChange={(event) => setFulfillmentType(event.target.value)} className="form-control">
              <option value="SHIPPING">Shipping</option>
              <option value="PICKUP">Local pickup</option>
              <option value="DROPOFF">Local dropoff</option>
            </select>
          </label>
          <label className="form-label">
            Name
            <input name="name" required autoComplete="name" placeholder="Jane Smith" className="form-control" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-label">
              Email
              <input name="email" type="email" required autoComplete="email" placeholder="jane@example.com" className="form-control" />
            </label>
            <label className="form-label">
              Phone
              <input name="phone" required autoComplete="tel" placeholder="555-123-4567" className="form-control" />
            </label>
          </div>
          <label className="form-label">
            Address for shipping/dropoff
            <input name="address1" required={fulfillmentType !== "PICKUP"} autoComplete="street-address" placeholder="Street address" className="form-control" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="form-label">
              City
              <input name="city" required={fulfillmentType !== "PICKUP"} autoComplete="address-level2" placeholder="City" className="form-control" />
            </label>
            <label className="form-label">
              State
              <input name="state" required={fulfillmentType !== "PICKUP"} autoComplete="address-level1" placeholder="State" className="form-control" />
            </label>
            <label className="form-label">
              ZIP
              <input name="postalCode" required={fulfillmentType !== "PICKUP"} autoComplete="postal-code" placeholder="ZIP" className="form-control" />
            </label>
          </div>
          <label className="form-label">
            Notes or customization details
            <textarea name="notes" rows={4} placeholder="Colors, name, pickup notes, or timing details" className="form-control" />
          </label>
          <label className="flex gap-3 text-sm leading-6">
            <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-boutique-pink" />
            <span>I consent to K&K Kustom Kreations contacting me about my order, custom request, pickup/dropoff, and related business updates.</span>
          </label>
          <label className="flex gap-3 text-sm leading-6">
            <input name="marketingConsent" type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" />
            <span>I would like to receive updates about new products, events, and promotions.</span>
          </label>
        </div>
      </section>

      <aside className="h-fit rounded-boutique border border-pink-100 bg-white p-5 shadow-pink">
        <h2 className="text-2xl font-black">Payment</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="grid grid-cols-[52px_1fr_auto] items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-aqua-50">
                <Image src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
              </div>
              <div>
                <p className="text-sm font-black leading-tight">{item.name}</p>
                <p className="text-xs text-boutique-charcoal/60">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-black">{formatMoney(item.priceCents * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-y border-pink-100 py-4">
          <span className="font-bold">Subtotal</span>
          <span className="text-xl font-black">{formatMoney(summary.subtotalCents)}</span>
        </div>

        <div className="mt-5 grid gap-3">
          <div id="square-card-container" className="min-h-12 rounded-xl border border-pink-100 bg-white p-3" />
          <button disabled={loading || !ready} className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-boutique-pink px-5 py-3 font-black text-white shadow-pink disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 size={18} aria-hidden="true" className="animate-spin" /> : <CreditCard size={18} aria-hidden="true" />}
            {loading ? "Processing..." : "Pay now"}
          </button>

          <div className="relative flex items-center py-1 text-xs font-black uppercase tracking-[0.18em] text-boutique-charcoal/45">
            <span className="h-px flex-1 bg-pink-100" />
            <span className="px-3">or</span>
            <span className="h-px flex-1 bg-pink-100" />
          </div>
          <div id="square-afterpay-container" className="min-h-10" />
          <button
            type="button"
            disabled={loading || !afterpayReady}
            onClick={(event) => submitPayment(event, "afterpay_clearpay")}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-aqua-200 bg-aqua-50 px-5 py-3 font-black text-boutique-charcoal shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={18} aria-hidden="true" />
            Afterpay/Clearpay
          </button>
        </div>

        {message && (
          <div className="mt-4 flex gap-2 rounded-xl border border-pink-100 bg-boutique-blush p-3 text-sm font-bold text-boutique-charcoal">
            <AlertCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-boutique-pink" />
            <p>{message}</p>
          </div>
        )}
        {config && (
          <p className="mt-4 flex items-center gap-2 text-xs font-bold text-boutique-charcoal/55">
            <CheckCircle2 size={15} aria-hidden="true" className="text-aqua-500" />
            Square {config.environment} checkout ready.
          </p>
        )}
      </aside>
    </form>
  );
}
