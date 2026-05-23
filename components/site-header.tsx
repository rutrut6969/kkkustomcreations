"use client";

import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { CartIndicator } from "@/components/cart-indicator";

const navItems = [
  ["Shop", "/shop"],
  ["Custom Orders", "/custom-orders"],
  ["Events", "/events"],
  ["Blog", "/blog"],
  ["About", "/about"],
  ["Contact", "/contact"]
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-black text-boutique-charcoal">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-aqua-100 text-boutique-pink shadow-soft">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate leading-tight">
            K&K <span className="max-[360px]:sr-only">Kustom Kreations</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-boutique-charcoal md:flex" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={clsx("transition hover:text-boutique-pink", pathname === href && "text-boutique-pink")}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <CartIndicator />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-aqua-200 bg-white text-boutique-charcoal shadow-soft md:hidden"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={clsx(
          "grid overflow-hidden border-t border-pink-50 bg-white transition-[grid-template-rows] duration-200 md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <nav className="min-h-0" aria-label="Mobile navigation">
          <div className="container-page grid gap-2 py-3">
            {navItems.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "rounded-2xl px-4 py-3 text-sm font-black transition hover:bg-boutique-blush hover:text-boutique-pink",
                  pathname === href ? "bg-boutique-blush text-boutique-pink" : "text-boutique-charcoal"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
