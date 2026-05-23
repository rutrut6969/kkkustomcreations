import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getIntegrationStatus } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const square = await getIntegrationStatus();
  return (
    <div>
      <AdminPageHeader title="Integrations" eyebrow="Square" description="Square checkout status and placeholders for Phase 2 catalog, inventory, and webhook syncing." />
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Square connection</h2>
              <p className="mt-1 text-sm text-boutique-charcoal/60">Environment: {square.environment}</p>
            </div>
            <StatusPill tone={square.hasAccessToken && square.hasApplicationId ? "aqua" : "pink"}>{square.hasAccessToken && square.hasApplicationId ? "Configured" : "Needs keys"}</StatusPill>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <p><span className="font-black">Access token:</span> {square.hasAccessToken ? "Present" : "Missing"}</p>
            <p><span className="font-black">Application ID:</span> {square.hasApplicationId ? "Present" : "Missing"}</p>
            <p><span className="font-black">Webhook signature key:</span> {square.hasWebhookKey ? "Present" : "Placeholder missing"}</p>
            <p><span className="font-black">Last sync:</span> {square.lastSync}</p>
          </div>
          <button className="mt-4 cursor-not-allowed rounded-xl bg-zinc-100 px-4 py-2 text-sm font-black text-zinc-500" disabled>
            Manual sync placeholder
          </button>
        </AdminCard>
        <AdminCard>
          <h2 className="font-black">Phase 2 sync plan</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-boutique-charcoal/70">
            <li>Catalog sync can map local Product records to Square catalog objects.</li>
            <li>Inventory sync can update stock and out-of-stock status.</li>
            <li>Webhook events can create Order, OrderItem, Customer, and SocialProofPurchase records without exposing private customer data.</li>
          </ul>
        </AdminCard>
      </div>
    </div>
  );
}
