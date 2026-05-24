import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { getSettings, getSocialProofPurchases } from "@/lib/data";
import { PublicChrome } from "@/components/public-chrome";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kkkustomcreations.vercel.app"),
  title: "K&K Kustom Kreations",
  description: "Handmade custom cups, tumblers, pens, keychains, badge reels, wristlets, seasonal gifts, and boutique creations.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" }
    ]
  },
  openGraph: {
    title: "K&K Kustom Kreations",
    description: "Handmade boutique crafts, custom sparkle, vendor-market favorites, and Square-powered checkout.",
    images: [{ url: "/logo-1024.png", width: 1024, height: 1024, alt: "K&K Kustom Kreations logo" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f45fa7"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, socialProof] = await Promise.all([getSettings(), getSocialProofPurchases()]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <PublicChrome settings={settings} socialProof={socialProof}>{children}</PublicChrome>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
