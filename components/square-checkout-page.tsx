"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Pencil, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { clearCart, getCart, getCartSummary, type CartItem } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

type SquareConfig = {
  environment: "sandbox" | "production";
  applicationId: string;
  locationId: string;
  sdkUrl: string;
};

type CustomerInfo = {
  fulfillmentType: "SHIPPING" | "PICKUP" | "DROPOFF";
  name: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
  consent: boolean;
  marketingConsent: boolean;
};

type SquareCard = {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: { message?: string; detail?: string }[] }>;
  destroy?(): Promise<boolean>;
};

type SquareAfterpay = SquareCard;
type GooglePlace = {
  address_components?: { long_name: string; short_name: string; types: string[] }[];
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
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (input: HTMLInputElement, options: unknown) => {
            addListener(eventName: string, callback: () => void): void;
            getPlace(): {
              address_components?: { long_name: string; short_name: string; types: string[] }[];
            };
          };
        };
      };
    };
  }
}

const storageKey = "kk_checkout_customer";
const defaultCustomer: CustomerInfo = {
  fulfillmentType: "SHIPPING",
  name: "",
  email: "",
  phone: "",
  address1: "",
  city: "",
  state: "",
  postalCode: "",
  notes: "",
  consent: false,
  marketingConsent: false
};

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

function loadGooglePlacesScript(key: string) {
  return new Promise<void>((resolve, reject) => {
    const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.google?.maps?.places) resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Address autocomplete could not load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Address autocomplete could not load."));
    document.head.appendChild(script);
  });
}

function errorText(errors?: { message?: string; detail?: string }[]) {
  return errors?.map((error) => error.message ?? error.detail).filter(Boolean).join(" ") || "Square could not tokenize this payment method.";
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatPhone(value: string) {
  const digits = digitsOnly(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function addressSummary(customer: CustomerInfo) {
  return [customer.address1, customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ");
}

function component(place: GooglePlace, type: string, field: "long_name" | "short_name" = "long_name") {
  return place.address_components?.find((item) => item.types.includes(type))?.[field] ?? "";
}

export function SquareCheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>(defaultCustomer);
  const [step, setStep] = useState<1 | 2 | 3>(2);
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [afterpayReady, setAfterpayReady] = useState(false);
  const [addressAutocompleteReady, setAddressAutocompleteReady] = useState(false);
  const cardRef = useRef<SquareCard | null>(null);
  const afterpayRef = useRef<SquareAfterpay | null>(null);
  const paymentsRef = useRef<ReturnType<NonNullable<typeof window.Square>["payments"]> | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const summary = useMemo(() => getCartSummary(items), [items]);
  const needsAddress = customer.fulfillmentType !== "PICKUP";

  useEffect(() => {
    setItems(getCart());
    try {
      const saved = window.sessionStorage.getItem(storageKey) ?? window.localStorage.getItem(storageKey);
      if (saved) setCustomer({ ...defaultCustomer, ...JSON.parse(saved) });
    } catch {
      setCustomer(defaultCustomer);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = JSON.stringify(customer);
    window.sessionStorage.setItem(storageKey, value);
    window.localStorage.setItem(storageKey, value);
  }, [customer]);

  useEffect(() => {
    let cancelled = false;
    async function bootSquare() {
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
            requestShippingContact: true
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
    bootSquare();
    return () => {
      cancelled = true;
      void cardRef.current?.destroy?.();
      void afterpayRef.current?.destroy?.();
    };
  }, [summary.subtotalCents]);

  useEffect(() => {
    const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!mapsKey || !addressInputRef.current) return;
    const googleMapsKey = mapsKey;
    let cancelled = false;
    async function bootPlaces() {
      try {
        await loadGooglePlacesScript(googleMapsKey);
        if (cancelled || !addressInputRef.current || !window.google?.maps?.places) return;
        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          componentRestrictions: { country: "us" },
          fields: ["address_components"],
          types: ["address"]
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const street = [component(place, "street_number"), component(place, "route")].filter(Boolean).join(" ");
          setCustomer((current) => ({
            ...current,
            address1: street || current.address1,
            city: component(place, "locality") || component(place, "sublocality") || current.city,
            state: component(place, "administrative_area_level_1", "short_name") || current.state,
            postalCode: component(place, "postal_code") || current.postalCode
          }));
        });
        setAddressAutocompleteReady(true);
      } catch {
        setAddressAutocompleteReady(false);
      }
    }
    bootPlaces();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateCustomer<K extends keyof CustomerInfo>(key: K, value: CustomerInfo[K]) {
    setCustomer((current) => ({ ...current, [key]: value }));
  }

  function validateCustomer() {
    if (!customer.name.trim() || !customer.email.includes("@")) return "Name and email are required.";
    if (digitsOnly(customer.phone).length !== 10) return "Please enter a valid 10-digit US phone number.";
    if (needsAddress && (!customer.address1.trim() || !customer.city.trim() || !customer.state.trim() || !customer.postalCode.trim())) {
      return "Address, city, state, and ZIP are required for shipping or local dropoff.";
    }
    if (!customer.consent) return "Required consent must be checked before payment.";
    return null;
  }

  function continueToPayment() {
    const validationError = validateCustomer();
    if (validationError) {
      setMessage(validationError);
      setStep(2);
      return;
    }
    setMessage(null);
    setStep(3);
  }

  async function submitPayment(event: FormEvent, paymentMethod: "card" | "afterpay_clearpay") {
    event.preventDefault();
    const validationError = validateCustomer();
    if (validationError) {
      setMessage(validationError);
      setStep(2);
      return;
    }
    if (!items.length) {
      setMessage("Your cart is empty.");
      return;
    }
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
              givenName: customer.name,
              email: customer.email,
              phone: digitsOnly(customer.phone),
              addressLines: [customer.address1],
              city: customer.city,
              state: customer.state,
              postalCode: customer.postalCode,
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
          fulfillmentType: customer.fulfillmentType,
          name: customer.name,
          email: customer.email,
          phone: digitsOnly(customer.phone),
          address1: customer.address1,
          city: customer.city,
          state: customer.state,
          postalCode: customer.postalCode,
          notes: customer.notes,
          consent: customer.consent,
          marketingConsent: customer.marketingConsent
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Payment could not be completed.");
      clearCart();
      window.sessionStorage.removeItem(storageKey);
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
    <form onSubmit={(event) => submitPayment(event, "card")} className="grid gap-7 lg:grid-cols-[1fr_420px]">
      <section className="space-y-5">
        <div className="grid gap-2 rounded-boutique border border-pink-100 bg-white p-4 shadow-soft sm:grid-cols-3">
          {["Cart Review", "Customer Info", "Payment"].map((label, index) => {
            const number = index + 1;
            const active = step === number;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(number as 1 | 2 | 3)}
                className={`rounded-2xl px-3 py-2 text-left text-sm font-black transition ${active ? "bg-boutique-pink text-white shadow-pink" : "bg-boutique-blush text-boutique-charcoal"}`}
              >
                <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white/80 text-xs text-boutique-charcoal">{number}</span>
                {label}
              </button>
            );
          })}
        </div>

        <section className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Cart review</h2>
            <button type="button" onClick={() => setStep(1)} className="text-sm font-black text-boutique-pink">Review items</button>
          </div>
          {step === 1 && (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.productId} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl bg-zinc-50 p-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-aqua-50">
                    <Image src={item.imageUrl} alt={item.name} fill sizes="56px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-black leading-tight">{item.name}</p>
                    <p className="text-sm text-boutique-charcoal/60">Qty {item.quantity}</p>
                  </div>
                  <p className="font-black">{formatMoney(item.priceCents * item.quantity)}</p>
                </div>
              ))}
              <button type="button" onClick={() => setStep(2)} className="focus-ring w-full rounded-full bg-boutique-pink px-5 py-3 font-black text-white shadow-pink sm:w-auto">
                Continue
              </button>
            </div>
          )}
        </section>

        <section className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Customer & fulfillment</h2>
            {step === 3 && (
              <button type="button" onClick={() => setStep(2)} className="focus-ring inline-flex items-center gap-2 rounded-full border border-pink-100 px-4 py-2 text-sm font-black text-boutique-pink">
                <Pencil size={15} aria-hidden="true" />
                Edit Info
              </button>
            )}
          </div>

          {step === 3 ? (
            <div className="mt-4 rounded-2xl bg-aqua-50 p-4 text-sm leading-6">
              <p><span className="font-black">Name:</span> {customer.name}</p>
              <p><span className="font-black">Email:</span> {customer.email}</p>
              <p><span className="font-black">Phone:</span> {formatPhone(customer.phone)}</p>
              <p><span className="font-black">Fulfillment:</span> {customer.fulfillmentType.replace("_", " ").toLowerCase()}</p>
              {addressSummary(customer) && <p><span className="font-black">Address:</span> {addressSummary(customer)}</p>}
              {customer.notes && <p><span className="font-black">Notes:</span> {customer.notes}</p>}
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              <label className="form-label">
                Fulfillment
                <select value={customer.fulfillmentType} onChange={(event) => updateCustomer("fulfillmentType", event.target.value as CustomerInfo["fulfillmentType"])} className="form-control">
                  <option value="SHIPPING">Shipping</option>
                  <option value="PICKUP">Local pickup</option>
                  <option value="DROPOFF">Local dropoff</option>
                </select>
              </label>
              <label className="form-label">
                Name
                <input value={customer.name} onChange={(event) => updateCustomer("name", event.target.value)} required autoComplete="name" placeholder="Jane Smith" className="form-control" />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-label">
                  Email
                  <input value={customer.email} onChange={(event) => updateCustomer("email", event.target.value)} type="email" required autoComplete="email" placeholder="jane@example.com" className="form-control" />
                </label>
                <label className="form-label">
                  Phone
                  <input value={formatPhone(customer.phone)} onChange={(event) => updateCustomer("phone", digitsOnly(event.target.value))} required inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" className="form-control" />
                </label>
              </div>
              <label className="form-label">
                Address for shipping/dropoff
                <input ref={addressInputRef} value={customer.address1} onChange={(event) => updateCustomer("address1", event.target.value)} required={needsAddress} autoComplete="street-address" placeholder="Street address" className="form-control" />
                <span className="text-xs font-bold text-boutique-charcoal/45">{addressAutocompleteReady ? "Start typing for address suggestions." : "Manual address entry is available."}</span>
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="form-label">
                  City
                  <input value={customer.city} onChange={(event) => updateCustomer("city", event.target.value)} required={needsAddress} autoComplete="address-level2" placeholder="City" className="form-control" />
                </label>
                <label className="form-label">
                  State
                  <input value={customer.state} onChange={(event) => updateCustomer("state", event.target.value.toUpperCase().slice(0, 2))} required={needsAddress} autoComplete="address-level1" placeholder="FL" className="form-control" />
                </label>
                <label className="form-label">
                  ZIP
                  <input value={customer.postalCode} onChange={(event) => updateCustomer("postalCode", event.target.value.replace(/\D/g, "").slice(0, 5))} required={needsAddress} inputMode="numeric" autoComplete="postal-code" placeholder="ZIP" className="form-control" />
                </label>
              </div>
              <label className="form-label">
                Notes or customization details
                <textarea value={customer.notes} onChange={(event) => updateCustomer("notes", event.target.value)} rows={4} placeholder="Colors, name, pickup notes, or timing details" className="form-control" />
              </label>
              <label className="flex gap-3 text-sm leading-6">
                <input checked={customer.consent} onChange={(event) => updateCustomer("consent", event.target.checked)} type="checkbox" required className="mt-1 h-4 w-4 accent-boutique-pink" />
                <span>I consent to K&K Kustom Kreations contacting me about my order, custom request, pickup/dropoff, and related business updates.</span>
              </label>
              <label className="flex gap-3 text-sm leading-6">
                <input checked={customer.marketingConsent} onChange={(event) => updateCustomer("marketingConsent", event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" />
                <span>I would like to receive updates about new products, events, and promotions.</span>
              </label>
              <button type="button" onClick={continueToPayment} className="focus-ring w-full rounded-full bg-boutique-pink px-5 py-3 font-black text-white shadow-pink sm:w-auto">
                Continue to payment
              </button>
            </div>
          )}
        </section>
      </section>

      <aside className="h-fit rounded-boutique border border-pink-100 bg-white p-5 shadow-pink">
        <h2 className="text-2xl font-black">Payment</h2>
        <p className="mt-1 text-sm font-bold text-boutique-charcoal/60">Pay securely by card or Afterpay/Clearpay when available.</p>
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

        <div className={step === 3 ? "mt-5 grid gap-3" : "mt-5 grid gap-3 opacity-60"}>
          {step !== 3 && <p className="rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-charcoal">Complete customer info to unlock payment.</p>}
          <div id="square-card-container" className="min-h-12 rounded-xl border border-pink-100 bg-white p-3" />
          <button disabled={loading || !ready || step !== 3} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-boutique-pink px-5 py-3 font-black text-white shadow-pink disabled:cursor-not-allowed disabled:opacity-50">
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
            disabled={loading || !afterpayReady || step !== 3}
            onClick={(event) => submitPayment(event, "afterpay_clearpay")}
            className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full border border-aqua-200 bg-aqua-50 px-5 py-3 font-black text-boutique-charcoal shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
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
