import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getSettings, getSocialProofPurchases } from "@/lib/data";
import { SocialProofPopup } from "@/components/social-proof-popup";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "K&K Kustom Kreations",
  description: "Handmade custom cups, tumblers, pens, keychains, badge reels, wristlets, seasonal gifts, and boutique creations."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, socialProof] = await Promise.all([getSettings(), getSocialProofPurchases()]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <SiteHeader />
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
