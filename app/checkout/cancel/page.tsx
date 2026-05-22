import Link from "next/link";
import { XCircle } from "lucide-react";

export default function CheckoutCancelPage() {
  return (
    <section className="container-page grid min-h-[60vh] place-items-center py-12">
      <div className="max-w-xl rounded-boutique border border-pink-100 bg-white p-8 text-center shadow-soft">
        <XCircle className="mx-auto text-boutique-pink" size={48} />
        <h1 className="mt-4 text-3xl font-black">Checkout was not completed</h1>
        <p className="mt-3 leading-7 text-boutique-charcoal/75">
          No worries. Your payment was not completed through Square. You can return to your cart and try again.
        </p>
        <Link href="/cart" className="mt-6 inline-flex rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink">
          Back to cart
        </Link>
      </div>
    </section>
  );
}
