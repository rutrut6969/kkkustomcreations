import { SquareCheckoutPage } from "@/components/square-checkout-page";
import { BrandLogo } from "@/components/brand-logo";
import { getSettings } from "@/lib/data";
import { parseShippingSettings } from "@/lib/shipping";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getSettings();
  const shippingSettings = parseShippingSettings(settings);
  return (
    <main className="container-page py-10">
      <div className="mb-7 max-w-2xl">
        <BrandLogo size="md" className="mb-3" />
        <p className="text-sm font-black uppercase tracking-[0.22em] text-boutique-pink">Secure checkout</p>
        <h1 className="mt-2 text-4xl font-black text-boutique-charcoal">Pay with Square</h1>
        <p className="mt-3 text-boutique-charcoal/70">
          Complete your order here with Square card payments. Afterpay/Clearpay appears automatically when Square makes it available for this cart and location.
        </p>
      </div>
      <SquareCheckoutPage shippingSettings={shippingSettings} />
    </main>
  );
}
