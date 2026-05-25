import Link from "next/link";
import {
  archiveCustomer,
  archiveEmptyCustomers,
  deleteArchivedEmptyCustomers,
  mergeDuplicateCustomers,
  permanentlyDeleteCustomer,
  restoreCustomer,
  saveCustomerAdmin
} from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminCustomers } from "@/lib/admin-data";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const filters = [
  ["all", "All customers"],
  ["marketing", "Marketing opted-in"],
  ["repeat", "Repeat buyers"],
  ["high-value", "High value"],
  ["recent", "Recent"],
  ["imported", "Imported/empty"],
  ["archived", "Archived"]
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

      <AdminCard className="mb-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-black">Customer data hygiene</h2>
            <p className="mt-1 text-sm font-bold text-boutique-charcoal/60">
              Clean imported/empty Square records without breaking order history. Orders keep their customer snapshot even when a customer profile is archived.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <form action={archiveEmptyCustomers}>
              <button className="w-full rounded-full bg-boutique-blush px-4 py-2 text-xs font-black text-boutique-pink">Archive empty</button>
            </form>
            <form action={mergeDuplicateCustomers}>
              <button className="w-full rounded-full bg-aqua-50 px-4 py-2 text-xs font-black text-aqua-700">Merge duplicates</button>
            </form>
            <form action={deleteArchivedEmptyCustomers}>
              <button className="w-full rounded-full bg-boutique-charcoal px-4 py-2 text-xs font-black text-white">Delete archived empty</button>
            </form>
          </div>
        </div>
      </AdminCard>

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
          const customerRecord = customer as any;
          const { firstName, lastName } = splitName(customer.name);
          return (
            <AdminCard key={customer.id}>
              <details>
                <summary className="grid cursor-pointer gap-4 xl:grid-cols-[1.2fr_1fr_auto] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-black">{customer.name}</h2>
                    {customer.marketingConsent && <StatusPill tone="pink">Marketing OK</StatusPill>}
                    {customer.orderConsent && <StatusPill tone="aqua">Order consent</StatusPill>}
                    {customerRecord.archivedAt && <StatusPill>Archived</StatusPill>}
                  </div>
                  <p className="mt-1 break-all text-sm font-bold text-boutique-charcoal/65">{customer.email ?? "No email"}</p>
                  <p className="text-sm text-boutique-charcoal/65">{customer.phone ?? "No phone"}</p>
                </div>
                <div className="text-sm leading-6 text-boutique-charcoal/70">
                  <p>{[customer.address1, customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ") || "No address saved"}</p>
                  <p className="font-bold">First: {firstName || "Unknown"} {lastName && `· Last: ${lastName}`}</p>
                  <p>Last order: {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "Not recorded"}</p>
                  {customerRecord.tags?.length ? <p>Tags: {customerRecord.tags.join(", ")}</p> : null}
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
                </summary>
                <div className="mt-4 border-t border-pink-100 pt-4">
                  <AdminForm action={saveCustomerAdmin} submitLabel="Save customer">
                    <input type="hidden" name="id" value={customer.id} />
                    <div className="grid gap-3 lg:grid-cols-2">
                      <label className="form-label">Name<input name="name" defaultValue={customer.name} className="form-control" /></label>
                      <label className="form-label">Email<input name="email" type="email" defaultValue={customer.email ?? ""} className="form-control" /></label>
                      <label className="form-label">Phone<input name="phone" defaultValue={customer.phone ?? ""} className="form-control" /></label>
                      <label className="form-label">Address<input name="address1" defaultValue={customer.address1 ?? ""} className="form-control" /></label>
                      <label className="form-label">City<input name="city" defaultValue={customer.city ?? ""} className="form-control" /></label>
                      <label className="form-label">State<input name="state" defaultValue={customer.state ?? ""} className="form-control" /></label>
                      <label className="form-label">ZIP<input name="postalCode" defaultValue={customer.postalCode ?? ""} className="form-control" /></label>
                      <label className="form-label">Country<input name="country" defaultValue={customer.country ?? "US"} className="form-control" /></label>
                    </div>
                    <label className="form-label">Tags<input name="tags" defaultValue={customerRecord.tags?.join(", ") ?? ""} className="form-control" /></label>
                    <label className="form-label">Admin notes<textarea name="notes" defaultValue={customerRecord.notes ?? ""} rows={4} className="form-control" /></label>
                    <div className="flex flex-wrap gap-4 text-sm font-bold">
                      <label className="flex items-center gap-2"><input name="marketingConsent" type="checkbox" defaultChecked={customer.marketingConsent} className="h-4 w-4 accent-boutique-pink" /> Marketing consent</label>
                      <label className="flex items-center gap-2"><input name="orderConsent" type="checkbox" defaultChecked={customer.orderConsent} className="h-4 w-4 accent-boutique-pink" /> Order/contact consent</label>
                    </div>
                  </AdminForm>
                  <div className="mt-4 rounded-2xl border border-pink-100 bg-zinc-50 p-3">
                    <h3 className="font-black">Order history</h3>
                    <p className="mt-1 text-sm text-boutique-charcoal/65">{customer._count.orders} tracked orders · {formatMoney(customer.totalSpentCents)} total spend.</p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {customerRecord.archivedAt ? (
                      <form action={restoreCustomer}><input type="hidden" name="id" value={customer.id} /><button className="w-full rounded-full bg-aqua-50 px-4 py-2 text-sm font-black text-aqua-700">Restore customer</button></form>
                    ) : (
                      <form action={archiveCustomer}><input type="hidden" name="id" value={customer.id} /><button className="w-full rounded-full bg-boutique-blush px-4 py-2 text-sm font-black text-boutique-pink">Archive customer</button></form>
                    )}
                    <form action={permanentlyDeleteCustomer} className="grid gap-2 md:col-span-2">
                      <input type="hidden" name="id" value={customer.id} />
                      <label className="flex items-start gap-2 text-xs font-bold text-boutique-charcoal/70"><input name="confirmDelete" type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" /> Confirm permanent delete, including customers with paid order history.</label>
                      <button className="w-full rounded-full bg-boutique-charcoal px-4 py-2 text-sm font-black text-white">Permanently delete</button>
                    </form>
                  </div>
                </div>
              </details>
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
