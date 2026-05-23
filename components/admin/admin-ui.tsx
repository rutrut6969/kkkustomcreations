import { clsx } from "clsx";

export function AdminPageHeader({
  title,
  eyebrow,
  description,
  children
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-black uppercase tracking-[0.16em] text-aqua-700">{eyebrow}</p>}
        <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-boutique-charcoal/65">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function AdminCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("rounded-2xl border border-pink-100 bg-white p-4 shadow-sm", className)}>{children}</div>;
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <AdminCard>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-boutique-charcoal/50">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {hint && <p className="mt-1 text-xs font-bold text-aqua-700">{hint}</p>}
    </AdminCard>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "pink" | "aqua" | "dark" }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
        tone === "pink" && "bg-boutique-blush text-boutique-pink",
        tone === "aqua" && "bg-aqua-50 text-aqua-700",
        tone === "dark" && "bg-boutique-charcoal text-white",
        tone === "neutral" && "bg-zinc-100 text-zinc-600"
      )}
    >
      {children}
    </span>
  );
}

export function AdminSectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-black">{title}</h2>
      {description && <p className="text-sm leading-6 text-boutique-charcoal/60">{description}</p>}
    </div>
  );
}
