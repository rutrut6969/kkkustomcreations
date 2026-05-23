import { saveOrder } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminOrders } from "@/lib/admin-data";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const orderStatuses = ["PENDING", "PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELED"];
const paymentStatuses = ["PENDING", "PAID", "REFUNDED", "FAILED"];

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  return (
    <div>
      <AdminPageHeader title="Orders" eyebrow="Commerce" description="Track website and imported Square orders, fulfillment status, payment status, and sync health." />
      <div className="space-y-3">
        {orders.map((order) => (
          <AdminCard key={order.id} className="p-0">
            <details>
              <summary className="grid cursor-pointer gap-3 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="font-black">{order.orderNumber} - {order.customerName}</p>
                  <p className="text-sm text-boutique-charcoal/60">{formatDate(order.createdAt)} - {order.fulfillmentType.toLowerCase()}</p>
                  <p className="mt-1 text-xs font-bold text-boutique-charcoal/45">Square order: {order.squareOrderId ?? "not linked"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="aqua">{order.status.replaceAll("_", " ")}</StatusPill>
                  <StatusPill tone={order.paymentStatus === "PAID" ? "dark" : "neutral"}>{order.paymentStatus}</StatusPill>
                  <StatusPill tone={order.syncStatus === "SYNCED" ? "aqua" : order.syncStatus === "ERROR" ? "pink" : "neutral"}>{order.syncStatus.replaceAll("_", " ")}</StatusPill>
                </div>
                <p className="text-lg font-black">{formatMoney(order.totalCents)}</p>
              </summary>
              <div className="grid gap-4 border-t border-pink-100 p-4 lg:grid-cols-[1fr_360px]">
                <div>
                  <h2 className="mb-2 font-black">Purchased products</h2>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-xl bg-zinc-50 p-3 text-sm">
                        <p className="font-black">{item.quantity} x {item.productName}</p>
                        <p>{formatMoney(item.totalCents)} {item.customizationNotes && `- ${item.customizationNotes}`}</p>
                      </div>
                    ))}
                    {order.items.length === 0 && <p className="text-sm text-boutique-charcoal/60">No line items recorded yet.</p>}
                  </div>
                  <div className="mt-4 rounded-xl bg-aqua-50 p-3 text-sm">
                    <p className="font-black">Customer info</p>
                    <p>{order.customerEmail ?? "No email"} - {order.customerPhone ?? "No phone"}</p>
                    <p>{[order.address1, order.city, order.state, order.postalCode].filter(Boolean).join(", ") || "No address on file"}</p>
                    {order.notes && <p className="mt-2">{order.notes}</p>}
                    {order.syncError && <p className="mt-2 font-bold text-boutique-pink">Square sync error: {order.syncError}</p>}
                  </div>
                </div>
                <AdminForm action={saveOrder} submitLabel="Update order">
                  <input type="hidden" name="id" value={order.id} />
                  <select aria-label="Order status" name="status" defaultValue={order.status} className="form-control">
                    {orderStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                  </select>
                  <select aria-label="Payment status" name="paymentStatus" defaultValue={order.paymentStatus} className="form-control">
                    {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <textarea aria-label="Internal notes" name="internalNotes" rows={5} defaultValue={order.internalNotes ?? ""} placeholder="Internal admin notes" className="form-control" />
                </AdminForm>
              </div>
            </details>
          </AdminCard>
        ))}
        {orders.length === 0 && <AdminCard><p className="text-sm text-boutique-charcoal/60">No orders yet. Use direct Square checkout, hosted checkout, or the Integrations page order import to populate this table.</p></AdminCard>}
      </div>
    </div>
  );
}
