import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getSecurityData() {
  if (!hasDatabaseUrl()) return { users: [], devices: [], subscriptions: [], logs: [] };
  const [users, devices, subscriptions, logs] = await Promise.all([
    (prisma as any).adminUser.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    (prisma as any).trustedDevice.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { adminUser: true } }),
    (prisma as any).adminPushSubscription.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { adminUser: true } }),
    (prisma as any).auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { actor: true } })
  ]);
  return { users, devices, subscriptions, logs };
}

export default async function AdminSecurityPage() {
  const { users, devices, subscriptions, logs } = await getSecurityData();

  return (
    <div>
      <AdminPageHeader
        title="Security"
        eyebrow="Accounts & trusted devices"
        description="Foundation for role-based accounts, admin push subscriptions, trusted devices, invite flows, and audit logs. Current production login remains the environment-password flow until email verification is configured."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard>
          <h2 className="font-black">Admin accounts</h2>
          <div className="mt-3 space-y-3">
            {users.map((user: any) => (
              <div key={user.id} className="rounded-xl bg-zinc-50 p-3">
                <p className="font-black">{user.name}</p>
                <p className="break-all text-sm text-boutique-charcoal/65">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill tone="aqua">{user.role}</StatusPill>
                  <StatusPill>{user.status}</StatusPill>
                </div>
              </div>
            ))}
            {!users.length && <p className="text-sm text-boutique-charcoal/60">No role-based admin accounts have been invited yet.</p>}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="font-black">Trusted devices</h2>
          <div className="mt-3 space-y-3">
            {devices.map((device: any) => (
              <div key={device.id} className="rounded-xl bg-zinc-50 p-3">
                <p className="font-black">{device.browser ?? "Unknown browser"}</p>
                <p className="text-sm text-boutique-charcoal/65">{device.adminUser?.email ?? "Unassigned"} · {device.ipAddress ?? "No IP"}</p>
                <div className="mt-2"><StatusPill tone={device.status === "APPROVED" ? "aqua" : "neutral"}>{device.status}</StatusPill></div>
              </div>
            ))}
            {!devices.length && <p className="text-sm text-boutique-charcoal/60">No trusted devices recorded yet.</p>}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="font-black">Push subscriptions</h2>
          <div className="mt-3 space-y-3">
            {subscriptions.map((subscription: any) => (
              <div key={subscription.id} className="rounded-xl bg-zinc-50 p-3">
                <p className="truncate font-black">{subscription.endpoint}</p>
                <p className="text-sm text-boutique-charcoal/65">{subscription.adminUser?.email ?? "Unassigned"}</p>
                <StatusPill tone={subscription.enabled ? "aqua" : "neutral"}>{subscription.enabled ? "Enabled" : "Disabled"}</StatusPill>
              </div>
            ))}
            {!subscriptions.length && <p className="text-sm text-boutique-charcoal/60">No admin push devices subscribed yet.</p>}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="font-black">Recent audit log</h2>
          <div className="mt-3 space-y-3">
            {logs.map((log: any) => (
              <div key={log.id} className="rounded-xl bg-zinc-50 p-3">
                <p className="font-black">{log.action}</p>
                <p className="text-sm text-boutique-charcoal/65">{log.actor?.email ?? "System"} · {log.entityType ?? "general"}</p>
              </div>
            ))}
            {!logs.length && <p className="text-sm text-boutique-charcoal/60">No audit activity recorded yet.</p>}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
