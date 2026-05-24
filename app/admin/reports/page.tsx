import Link from "next/link";
import { AdminCard, AdminPageHeader, StatCard, StatusPill } from "@/components/admin/admin-ui";
import { formatMoney } from "@/lib/format";
import { getSalesReport, rangeFromParams } from "@/lib/reports";

export const dynamic = "force-dynamic";

const periods = ["daily", "weekly", "monthly", "yearly", "custom"];

export default async function AdminReportsPage({ searchParams }: { searchParams?: { period?: string; from?: string; to?: string } }) {
  const period = searchParams?.period ?? "monthly";
  const range = rangeFromParams(period, searchParams?.from, searchParams?.to);
  const report = await getSalesReport(range);
  const query = new URLSearchParams({ period, from: range.from.toISOString().slice(0, 10), to: range.to.toISOString().slice(0, 10) }).toString();

  return (
    <div>
      <AdminPageHeader title="Reports" eyebrow="Sales" description="Review sales, fulfillment, payment status, top products, and inventory movement from local and imported Square orders.">
        <div className="flex flex-wrap gap-2">
          <Link href={`/api/admin/reports/export?format=csv&${query}`} className="rounded-full bg-boutique-pink px-4 py-2 text-sm font-black text-white shadow-pink">Export CSV</Link>
          <Link href={`/api/admin/reports/export?format=json&${query}`} className="rounded-full bg-aqua-50 px-4 py-2 text-sm font-black text-aqua-700">Export JSON</Link>
        </div>
      </AdminPageHeader>

      <form className="admin-form mb-5 grid gap-3 rounded-boutique border border-pink-100 bg-white p-4 shadow-soft md:grid-cols-[1fr_1fr_1fr_auto]">
        <select name="period" defaultValue={period} className="form-control" aria-label="Report period">
          {periods.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input name="from" type="date" defaultValue={range.from.toISOString().slice(0, 10)} className="form-control" aria-label="From date" />
        <input name="to" type="date" defaultValue={range.to.toISOString().slice(0, 10)} className="form-control" aria-label="To date" />
        <button className="focus-ring w-full rounded-full bg-boutique-charcoal px-5 py-3 text-sm font-black text-white md:w-auto">Run</button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Gross sales" value={formatMoney(report.grossSales)} />
        <StatCard label="Orders" value={report.orderCount} />
        <StatCard label="Average order" value={formatMoney(report.averageOrderValue)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <AdminCard>
          <h2 className="font-black">Top products</h2>
          <div className="mt-3 grid gap-2">
            {report.topProducts.map((product) => (
              <div key={product.productName} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 text-sm">
                <span className="font-black">{product.productName}</span>
                <span>{product.units} units - {formatMoney(product.salesCents)}</span>
              </div>
            ))}
            {report.topProducts.length === 0 && <p className="text-sm text-boutique-charcoal/60">No product sales in this range.</p>}
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="font-black">Breakdowns</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-black">Fulfillment</p>
              <div className="flex flex-wrap gap-2">{report.fulfillment.map((item) => <StatusPill key={item.label}>{item.label}: {item.count}</StatusPill>)}</div>
            </div>
            <div>
              <p className="mb-2 text-sm font-black">Payment</p>
              <div className="flex flex-wrap gap-2">{report.paymentStatus.map((item) => <StatusPill key={item.label}>{item.label}: {item.count}</StatusPill>)}</div>
            </div>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="font-black">Inventory movement</h2>
          <div className="mt-3 grid gap-2">
            {report.inventoryMovement.map((item) => (
              <div key={item.productName} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-sm">
                <span className="font-black">{item.productName}</span>
                <span>{item.units} sold</span>
              </div>
            ))}
            {report.inventoryMovement.length === 0 && <p className="text-sm text-boutique-charcoal/60">No inventory movement in this range.</p>}
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="font-black">Printable summary</h2>
          <p className="mt-2 text-sm leading-6 text-boutique-charcoal/70">Use your browser print command from this page for a clean printable report. Exports include the same date range and order data.</p>
        </AdminCard>
      </div>
    </div>
  );
}
