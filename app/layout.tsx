import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ShoppingBag, Sparkles } from "lucide-react";
import "./globals.css";
import { getSettings, getSocialProofPurchases } from "@/lib/data";
import { SocialProofPopup } from "@/components/social-proof-popup";

export const metadata: Metadata = {
  title: "K&K Kustom Kreations",
  description: "Handmade custom cups, tumblers, pens, keychains, badge reels, wristlets, seasonal gifts, and boutique creations."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

const navItems = [
  ["Shop", "/shop"],
  ["Custom Orders", "/custom-orders"],
  ["Events", "/events"],
  ["Blog", "/blog"],
  ["About", "/about"],
  ["Contact", "/contact"]
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, socialProof] = await Promise.all([getSettings(), getSocialProofPurchases()]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/92 backdrop-blur">
            <div className="container-page flex h-16 items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2 font-black text-boutique-charcoal">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-aqua-100 text-boutique-pink shadow-soft">
                  <Sparkles size={20} />
                </span>
                <span className="leading-tight">
                  K&K <span className="hidden sm:inline">Kustom Kreations</span>
                </span>
              </Link>
              <nav className="hidden items-center gap-5 text-sm font-semibold text-boutique-charcoal md:flex">
                {navItems.map(([label, href]) => (
                  <Link key={href} href={href} className="transition hover:text-boutique-pink">
                    {label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/cart"
                aria-label="Cart"
                className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-boutique-pink text-white shadow-pink transition hover:-translate-y-0.5"
              >
                <ShoppingBag size={19} />
              </Link>
            </div>
            <div className="border-t border-pink-50 bg-boutique-blush md:hidden">
              <nav className="container-page flex gap-4 overflow-x-auto py-3 text-sm font-semibold">
                {navItems.map(([label, href]) => (
                  <Link key={href} href={href} className="shrink-0">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="mt-16 border-t border-pink-100 bg-white">
            <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="text-lg font-black">{settings.businessName ?? "K&K Kustom Kreations"}</p>
                <p className="mt-3 max-w-md text-sm leading-6 text-boutique-charcoal/75">{settings.businessInfo}</p>
              </div>
              <div className="text-sm leading-7">
                <p className="font-bold">Shop</p>
                <Link href="/shop" className="block hover:text-boutique-pink">Products</Link>
                <Link href="/custom-orders" className="block hover:text-boutique-pink">Custom Orders</Link>
                <Link href="/events" className="block hover:text-boutique-pink">Events</Link>
              </div>
              <div className="text-sm leading-7">
                <p className="font-bold">Help</p>
                <Link href="/contact" className="block hover:text-boutique-pink">Contact</Link>
                <Link href="/privacy" className="block hover:text-boutique-pink">Privacy & Consent</Link>
                <Link href="/admin" className="block hover:text-boutique-pink">Admin</Link>
              </div>
            </div>
          </footer>
          <SocialProofPopup purchases={socialProof} />
        </div>
      </body>
    </html>
  );
}
