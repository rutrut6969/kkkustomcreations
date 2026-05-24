import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Gift, HeartHandshake, Sparkles } from "lucide-react";
import { getAnnouncements, getEvents, getFeaturedProducts, getSettings } from "@/lib/data";
import { ButtonLink } from "@/components/button-link";
import { ProductCard } from "@/components/product-card";
import { FeaturedEventsCarousel } from "@/components/featured-events-carousel";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, announcements, featuredProducts, events] = await Promise.all([
    getSettings(),
    getAnnouncements(),
    getFeaturedProducts(),
    getEvents()
  ]);

  return (
    <>
      <section className="container-page grid gap-8 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-14">
        <div className="min-w-0 space-y-6">
          {announcements[0] && (
            <div className="max-w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-bold leading-6 shadow-soft sm:rounded-full">
              <div className="flex min-w-0 items-start gap-2">
                <Sparkles size={16} className="mt-1 shrink-0 text-boutique-pink" aria-hidden="true" />
                <p className="min-w-0">
                  <span className="font-black text-boutique-pink">{announcements[0].title}:</span>{" "}
                  {announcements[0].body}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-aqua-700">Handmade boutique crafts</p>
            <h1 className="break-words text-4xl font-black leading-tight text-boutique-charcoal sm:text-5xl lg:text-6xl">
              K&K Kustom Kreations
            </h1>
            <p className="max-w-xl text-lg leading-8 text-boutique-charcoal/75">
              {settings.homepageBannerText || "Handmade gifts, custom sparkle, and vendor-market favorites."}
            </p>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <ButtonLink href="/shop">Shop ready-made</ButtonLink>
            <ButtonLink href="/custom-orders" variant="secondary">Start a custom order</ButtonLink>
          </div>
        </div>
        <div className="relative min-h-[360px] min-w-0 overflow-hidden rounded-boutique bg-aqua-100 shadow-pink">
          <Image
            src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80"
            alt="Colorful handmade craft supplies"
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-boutique-charcoal/70 via-boutique-charcoal/25 to-white/20" />
          <div className="absolute inset-x-4 bottom-4 rounded-boutique border border-white/80 bg-white/98 p-4 shadow-pink backdrop-blur-md">
            <p className="text-base font-black leading-7 text-boutique-charcoal drop-shadow-sm">
              Cups, pens, keychains, badge reels, wristlets, seasonal drops, and custom pieces.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white/72 py-10">
        <div className="container-page grid gap-4 sm:grid-cols-3">
          {[
            ["Custom sparkle", "Personal colors, names, themes, and handmade details.", Gift],
            ["Local events", "Find new pieces at vendor malls and community markets.", CalendarDays],
            ["Easy checkout", "Pay securely by card or Afterpay/Clearpay when available.", HeartHandshake]
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

      <FeaturedEventsCarousel events={events} />
    </>
  );
}
