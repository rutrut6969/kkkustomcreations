import { importSquareOrdersAction, pullSquareCatalogAction, pullSquareCategoriesAction, pushAllCategoriesAction } from "@/app/admin/actions";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getSquareSyncDashboard } from "@/lib/square-sync";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const square = await getSquareSyncDashboard();
  return (
    <div>
      <AdminPageHeader title="Integrations" eyebrow="Square" description="Sync Square products, categories, inventory, prices, and orders with the website." />
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
            <p><span className="font-black">Active access token:</span> {square.hasAccessToken ? "Present" : "Missing"}</p>
            <p><span className="font-black">Active application ID:</span> {square.hasApplicationId ? "Present" : "Missing"}</p>
            <p><span className="font-black">Active location ID:</span> {square.hasLocationId ? "Present" : "Can auto-discover active location"}</p>
            <p><span className="font-black">Sandbox keys:</span> {square.hasSandboxToken && square.hasSandboxApplicationId ? "Ready" : "Missing token/app"} {square.hasSandboxLocationId ? "with location" : "auto-location"}</p>
            <p><span className="font-black">Production keys:</span> {square.hasProductionToken && square.hasProductionApplicationId ? "Ready" : "Missing token/app"} {square.hasProductionLocationId ? "with location" : "auto-location"}</p>
            <p><span className="font-black">Webhook signature key:</span> {square.hasWebhookKey ? "Present" : "Missing"}</p>
            <p><span className="font-black">Last catalog pull:</span> {square.lastCatalogPull}</p>
            <p><span className="font-black">Last category push:</span> {square.lastCategoryPush}</p>
            <p><span className="font-black">Last order import:</span> {square.lastOrderImport}</p>
            <p><span className="font-black">Last successful checkout:</span> {square.lastSuccessfulCheckout}</p>
            <p><span className="font-black">Last inventory adjustment:</span> {square.lastInventoryAdjustment}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <AdminActionForm action={pullSquareCatalogAction} label="Pull catalog from Square" tone="pink" />
            <AdminActionForm action={pullSquareCategoriesAction} label="Pull categories only" tone="aqua" />
            <AdminActionForm action={pushAllCategoriesAction} label="Push all categories" tone="neutral" />
            <AdminActionForm action={importSquareOrdersAction} label="Import Square orders" tone="aqua" />
          </div>
          {square.environment === "production" && (!square.hasProductionToken || !square.hasProductionApplicationId) && (
            <p className="mt-4 rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-pink">
              Production mode is active, but production Square token/application keys are missing.
            </p>
          )}
        </AdminCard>
        <AdminCard>
          <h2 className="font-black">Source of truth</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-boutique-charcoal/70">
            <li>Square owns payments, orders, live inventory, prices, and product variants.</li>
            <li>Prisma stores local display choices like featured products, images, descriptions, content, and sync status.</li>
            <li>Webhook processing is ready to layer on top of the sync log without exposing private customer data.</li>
          </ul>
        </AdminCard>
      </div>
      <AdminCard className="mt-5">
        <h2 className="font-black">Recent sync activity</h2>
        <div className="mt-3 grid gap-2">
          {square.recentLogs.length === 0 && <p className="text-sm text-boutique-charcoal/60">No sync activity yet.</p>}
          {square.recentLogs.map((log) => (
            <div key={log.id} className="grid gap-2 rounded-xl border border-pink-100 bg-white p-3 text-sm sm:grid-cols-[160px_120px_1fr_auto] sm:items-center">
              <span className="font-black">{log.action}</span>
              <StatusPill tone={log.status === "SYNCED" ? "aqua" : log.status === "ERROR" ? "pink" : "neutral"}>{log.status.replaceAll("_", " ")}</StatusPill>
              <span className="text-boutique-charcoal/70">{log.message ?? "No message"}</span>
              <span className="text-xs font-bold text-boutique-charcoal/45">{log.createdAt.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
