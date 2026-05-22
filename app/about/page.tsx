import { Heart, Palette, ShoppingBag } from "lucide-react";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <section className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">About</p>
          <h1 className="mt-2 text-4xl font-black">Handmade pieces with a boutique pop</h1>
          <p className="mt-4 leading-8 text-boutique-charcoal/75">{settings.businessInfo}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {[
            [Heart, "Made with care"],
            [Palette, "Custom themes"],
            [ShoppingBag, "Markets and online checkout"]
          ].map(([Icon, label]) => (
            <div key={label as string} className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
              <Icon className="text-boutique-pink" />
              <p className="mt-3 font-black">{label as string}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
