import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <section className="container-page grid min-h-[60vh] place-items-center py-12">
      <div className="max-w-xl rounded-boutique border border-pink-100 bg-white p-8 text-center shadow-pink">
        <CheckCircle2 className="mx-auto text-aqua-700" size={48} />
        <h1 className="mt-4 text-3xl font-black">Thank you for your order!</h1>
        <p className="mt-3 leading-7 text-boutique-charcoal/75">
          Square has received your checkout. K&K Kustom Kreations will follow up about shipping, pickup, dropoff, or custom details.
        </p>
        <Link href="/shop" className="mt-6 inline-flex rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink">
          Keep shopping
        </Link>
      </div>
    </section>
  );
}
