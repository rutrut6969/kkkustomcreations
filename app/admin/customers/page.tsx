import Link from "next/link";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminCustomers } from "@/lib/admin-data";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const filters = [
  ["all", "All customers"],
  ["marketing", "Marketing opted-in"],
  ["repeat", "Repeat buyers"],
  ["high-value", "High value"],
  ["recent", "Recent"]
];

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export default async function AdminCustomersPage({ searchParams }: { searchParams?: { filter?: string } }) {
  const activeFilter = searchParams?.filter ?? "all";
  const customers = await getAdminCustomers(activeFilter);

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        eyebrow="Audience"
        description="Customer records are created from real checkout/order submissions and can be exported for business reporting or opted-in marketing audiences."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/api/admin/customers/export?format=csv" className="rounded-full bg-boutique-pink px-4 py-2 text-center text-sm font-black text-white shadow-pink">
            Export CSV
          </Link>
          <Link href="/api/admin/customers/export?format=meta" className="rounded-full border border-aqua-200 bg-aqua-50 px-4 py-2 text-center text-sm font-black text-aqua-700">
            Meta audience
          </Link>
        </div>
      </AdminPageHeader>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {filters.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/customers?filter=${value}`}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${activeFilter === value ? "bg-boutique-pink text-white shadow-pink" : "bg-white text-boutique-charcoal shadow-soft"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {customers.map((customer) => {
          const { firstName, lastName } = splitName(customer.name);
          return (
            <AdminCard key={customer.id}>
              <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_auto] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-black">{customer.name}</h2>
                    {customer.marketingConsent && <StatusPill tone="pink">Marketing OK</StatusPill>}
                    {customer.orderConsent && <StatusPill tone="aqua">Order consent</StatusPill>}
                  </div>
                  <p className="mt-1 break-all text-sm font-bold text-boutique-charcoal/65">{customer.email ?? "No email"}</p>
                  <p className="text-sm text-boutique-charcoal/65">{customer.phone ?? "No phone"}</p>
                </div>
                <div className="text-sm leading-6 text-boutique-charcoal/70">
                  <p>{[customer.address1, customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ") || "No address saved"}</p>
                  <p className="font-bold">First: {firstName || "Unknown"} {lastName && `· Last: ${lastName}`}</p>
                  <p>Last order: {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "Not recorded"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:min-w-72">
                  <div className="rounded-xl bg-aqua-50 p-3">
                    <p className="text-xs font-black uppercase text-aqua-700">Orders</p>
                    <p className="text-xl font-black">{customer._count.orders}</p>
                  </div>
                  <div className="rounded-xl bg-boutique-blush p-3">
                    <p className="text-xs font-black uppercase text-boutique-pink">Spent</p>
                    <p className="text-xl font-black">{formatMoney(customer.totalSpentCents)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs font-black uppercase text-zinc-500">Country</p>
                    <p className="text-xl font-black">{customer.country ?? "US"}</p>
                  </div>
                </div>
              </div>
            </AdminCard>
          );
        })}
        {customers.length === 0 && (
          <AdminCard>
            <p className="text-sm font-bold text-boutique-charcoal/60">No customers match this filter yet.</p>
          </AdminCard>
        )}
      </div>
    </div>
  );
}
