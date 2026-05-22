import { CartPage } from "@/components/cart-page";

export default function CartRoute() {
  return (
    <section className="container-page py-10">
      <div className="mb-7">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Cart</p>
        <h1 className="text-4xl font-black">Review your handmade finds</h1>
      </div>
      <CartPage />
    </section>
  );
}
