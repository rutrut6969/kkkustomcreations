"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  BarChart3,
  Bell,
  BookOpenText,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FolderTree,
  Home,
  Image,
  Inbox,
  Menu,
  MessageSquare,
  Package,
  PieChart,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  WandSparkles,
  X
} from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { BrandLogo } from "@/components/brand-logo";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: BarChart3 },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Quick Add", href: "/admin/quick-add", icon: WandSparkles },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Custom Orders", href: "/admin/custom-orders", icon: ClipboardList },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Blog Posts", href: "/admin/blog", icon: BookOpenText },
  { label: "Announcements", href: "/admin/announcements", icon: Bell },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  { label: "Reports", href: "/admin/reports", icon: PieChart },
  { label: "Homepage Settings", href: "/admin/homepage", icon: Home },
  { label: "Media Library", href: "/admin/media", icon: Image },
  { label: "Integrations", href: "/admin/integrations", icon: CreditCard },
  { label: "Security", href: "/admin/security", icon: ShieldCheck },
  { label: "Site Settings", href: "/admin/settings", icon: Settings }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  if (pathname === "/admin/login" || pathname.startsWith("/admin/invite/")) {
    return <>{children}</>;
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-pink-100 bg-white shadow-xl lg:shadow-none">
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-pink-100 bg-white px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-2 font-black">
          <BrandLogo size="sm" />
          <span className="truncate">K&K Admin</span>
        </Link>
        <button
          type="button"
          className="focus-ring grid h-9 w-9 place-items-center rounded-full text-boutique-charcoal lg:hidden"
          aria-label="Close admin menu"
          onClick={() => setOpen(false)}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                active ? "bg-boutique-blush text-boutique-pink" : "text-boutique-charcoal/75 hover:bg-aqua-50 hover:text-boutique-charcoal"
              )}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-pink-100 p-3">
        <Link href="/" className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-boutique-charcoal/70 hover:bg-aqua-50">
          <ChevronLeft size={17} aria-hidden="true" />
          Storefront
        </Link>
        <form action={logoutAdmin}>
          <button className="focus-ring w-full rounded-xl bg-boutique-charcoal px-3 py-2 text-sm font-black text-white">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fbfb] text-boutique-charcoal">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div>
      <div className={clsx("fixed inset-0 z-50 bg-boutique-charcoal/35 transition lg:hidden", open ? "block" : "hidden")} onClick={() => setOpen(false)} />
      <div className={clsx("fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden", open ? "translate-x-0" : "-translate-x-full")}>
        {sidebar}
      </div>
      <div className="lg:pl-72">
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-pink-100 bg-white/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6 lg:sticky lg:inset-x-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-pink-100 bg-white shadow-soft lg:hidden"
              aria-label="Open admin menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-aqua-700">K&K Kustom Kreations</p>
              <p className="font-black">Commerce Admin</p>
            </div>
          </div>
          <Link href="/cart" className="hidden rounded-full border border-aqua-200 px-4 py-2 text-sm font-black text-aqua-700 sm:inline-flex">
            View Cart
          </Link>
        </header>
        <main className="mx-auto max-w-7xl overflow-x-hidden px-3 pb-5 pt-20 sm:px-6 lg:px-8 lg:pt-5">{children}</main>
      </div>
    </div>
  );
}
