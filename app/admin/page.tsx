import Link from "next/link";
import { AdminCard, AdminPageHeader, StatCard, StatusPill } from "@/components/admin/admin-ui";
import { getAdminActivity, getAdminMetrics } from "@/lib/admin-data";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metrics, activity] = await Promise.all([getAdminMetrics(), getAdminActivity()]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Dashboard"
        title="Boutique commerce overview"
        description="A compact snapshot of products, orders, custom work, messages, and upcoming events."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Products" value={metrics.totalProducts} hint="Catalog items" />
        <StatCard label="Orders" value={metrics.recentOrders} hint="All-time tracked" />
        <StatCard label="Custom Requests" value={metrics.pendingCustomRequests} hint="Needs attention" />
        <StatCard label="Upcoming Events" value={metrics.upcomingEvents} hint="Vendor calendar" />
        <StatCard label="Messages" value={metrics.recentMessages} hint="Customer inbox" />
        <StatCard label="Featured" value={metrics.featuredProducts} hint="Homepage products" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-black">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-black text-boutique-pink">View all</Link>
          </div>
          <div className="space-y-3">
            {activity.orders.map((order) => (
              <div key={order.id} className="grid gap-2 rounded-xl bg-zinc-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-black">{order.orderNumber} · {order.customerName}</p>
                  <p className="text-sm text-boutique-charcoal/60">{formatDate(order.createdAt)} · {order.fulfillmentType.toLowerCase()}</p>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <StatusPill tone="aqua">{order.status.replaceAll("_", " ")}</StatusPill>
                  <span className="font-black">{formatMoney(order.totalCents)}</span>
                </div>
              </div>
            ))}
            {activity.orders.length === 0 && <p className="text-sm text-boutique-charcoal/60">No orders tracked yet. Square webhook order capture is ready for Phase 2.</p>}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-black">Work queue</h2>
            <Link href="/admin/custom-orders" className="text-sm font-black text-boutique-pink">Custom orders</Link>
          </div>
          <div className="space-y-3">
            {activity.customOrders.map((request) => (
              <div key={request.id} className="rounded-xl bg-boutique-blush p-3">
                <p className="font-black">{request.name} · {request.itemType}</p>
                <p className="line-clamp-2 text-sm text-boutique-charcoal/70">{request.designRequest}</p>
              </div>
            ))}
            {activity.messages.slice(0, 3).map((message) => (
              <div key={message.id} className="rounded-xl bg-aqua-50 p-3">
                <p className="font-black">{message.name}</p>
                <p className="line-clamp-2 text-sm text-boutique-charcoal/70">{message.message}</p>
              </div>
            ))}
            {activity.customOrders.length === 0 && activity.messages.length === 0 && <p className="text-sm text-boutique-charcoal/60">No customer activity yet.</p>}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
