import Image from "next/image";
import { clsx } from "clsx";

export function BrandLogo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dimensions = size === "lg" ? 88 : size === "sm" ? 40 : 52;
  return (
    <span
      className={clsx(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-soft ring-1 ring-pink-100",
        size === "lg" && "h-22 w-22",
        size === "md" && "h-13 w-13",
        size === "sm" && "h-10 w-10",
        className
      )}
      style={{ height: dimensions, width: dimensions }}
    >
      <Image
        src="/logo-1024.png"
        alt="K&K Kustom Kreations"
        width={dimensions}
        height={dimensions}
        sizes={`${dimensions}px`}
        className="h-full w-full object-cover"
        priority={size === "md"}
      />
    </span>
  );
}
