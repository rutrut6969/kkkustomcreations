import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";

export function ButtonLink({
  href,
  children,
  variant = "primary"
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black transition hover:-translate-y-0.5",
        variant === "primary"
          ? "bg-boutique-pink text-white shadow-pink"
          : "border-2 border-aqua-300 bg-white text-boutique-charcoal shadow-soft"
      )}
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
