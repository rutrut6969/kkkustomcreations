"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SocialProofPopup } from "@/components/social-proof-popup";
import type { SocialProofView } from "@/lib/types";
import { BrandLogo } from "@/components/brand-logo";

export function PublicChrome({
  children,
  settings,
  socialProof
}: {
  children: React.ReactNode;
  settings: Record<string, string>;
  socialProof: SocialProofView[];
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <footer className="mt-16 border-t border-pink-100 bg-white">
        <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <p className="text-lg font-black">{settings.businessName ?? "K&K Kustom Kreations"}</p>
            </div>
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
        <div className="border-t border-pink-50 py-3 text-center text-xs font-bold text-boutique-charcoal/45">
          Powered by{" "}
          <a href="https://obsidian-systems.tech" target="_blank" rel="noopener noreferrer" className="hover:text-boutique-pink">
            Obsidian Systems LLC
          </a>
        </div>
      </footer>
      <SocialProofPopup purchases={socialProof} />
    </>
  );
}
