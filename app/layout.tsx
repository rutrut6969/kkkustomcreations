import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings, getSocialProofPurchases } from "@/lib/data";
import { PublicChrome } from "@/components/public-chrome";

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
          <PublicChrome settings={settings} socialProof={socialProof}>{children}</PublicChrome>
        </div>
      </body>
    </html>
  );
}
