import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Gift, HeartHandshake, Sparkles } from "lucide-react";
import { getAnnouncements, getEvents, getFeaturedProducts, getSettings } from "@/lib/data";
import { ButtonLink } from "@/components/button-link";
import { ProductCard } from "@/components/product-card";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, announcements, featuredProducts, events] = await Promise.all([
    getSettings(),
    getAnnouncements(),
    getFeaturedProducts(),
    getEvents()
  ]);
  const featuredEvent = events.find((event) => event.featured) ?? events[0];

  return (
    <>
      <section className="container-page grid gap-8 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-14">
        <div className="space-y-6">
          {announcements[0] && (
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-pink-100 bg-white px-4 py-2 text-sm font-bold shadow-soft">
              <Sparkles size={16} className="text-boutique-pink" />
              <span className="truncate">{announcements[0].title}: {announcements[0].body}</span>
            </div>
          )}
          <div className="space-y-4">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-aqua-700">Handmade boutique crafts</p>
            <h1 className="text-4xl font-black leading-tight text-boutique-charcoal sm:text-5xl lg:text-6xl">
              K&K Kustom Kreations
            </h1>
            <p className="max-w-xl text-lg leading-8 text-boutique-charcoal/75">
              {settings.homepageBannerText ?? "Handmade gifts, custom sparkle, and vendor-market favorites."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/shop">Shop ready-made</ButtonLink>
            <ButtonLink href="/custom-orders" variant="secondary">Start a custom order</ButtonLink>
          </div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-boutique bg-aqua-100 shadow-pink">
          <Image
            src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80"
            alt="Colorful handmade craft supplies"
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-4 bottom-4 rounded-boutique bg-white/92 p-4 shadow-soft">
            <p className="font-black">Cups, pens, keychains, badge reels, wristlets, seasonal drops, and custom pieces.</p>
          </div>
        </div>
      </section>

      <section className="bg-white/72 py-10">
        <div className="container-page grid gap-4 sm:grid-cols-3">
          {[
            ["Custom sparkle", "Personal colors, names, themes, and handmade details.", Gift],
            ["Local events", "Find new pieces at vendor malls and community markets.", CalendarDays],
            ["Easy checkout", "Square-hosted checkout keeps payments familiar and secure.", HeartHandshake]
          ].map(([title, body, Icon]) => (
            <div key={title as string} className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
              <Icon className="text-boutique-pink" />
              <h2 className="mt-3 text-lg font-black">{title as string}</h2>
              <p className="mt-2 text-sm leading-6 text-boutique-charcoal/70">{body as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Featured shop</p>
            <h2 className="text-3xl font-black">Fresh handmade favorites</h2>
          </div>
          <Link href="/shop" className="text-sm font-black text-boutique-pink hover:underline">View all</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {featuredEvent && (
        <section className="container-page rounded-boutique border border-aqua-100 bg-aqua-50 p-6 shadow-soft md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Next featured event</p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="text-2xl font-black">{featuredEvent.title}</h2>
              <p className="mt-2 text-boutique-charcoal/75">
                {formatDate(featuredEvent.date)} · {featuredEvent.time} · {featuredEvent.location}
              </p>
              <p className="mt-3 max-w-2xl leading-7 text-boutique-charcoal/75">{featuredEvent.description}</p>
            </div>
            <ButtonLink href="/events" variant="secondary">See events</ButtonLink>
          </div>
        </section>
      )}
    </>
  );
}
