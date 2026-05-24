import { inviteAdminUser, revokeTrustedDevice, updateAdminUserStatus } from "@/app/admin/actions";
import { AdminPushManager } from "@/components/admin/admin-push-manager";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin-form";
import { ADMIN_ROLES } from "@/lib/admin-security";
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
        description="Manage admin accounts, device trust, invite links, push-subscription readiness, and audit history. The environment admin remains the bootstrap Super Admin."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard>
          <h2 className="font-black">Admin accounts</h2>
          <div className="mt-3 rounded-xl border border-aqua-100 bg-aqua-50/60 p-3">
            <h3 className="font-black">Invite account</h3>
            <AdminForm action={inviteAdminUser} submitLabel="Send Invite">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-label">
                  Trusted email
                  <input name="email" type="email" required className="form-control" placeholder="name@example.com" />
                </label>
                <label className="form-label">
                  Display name
                  <input name="name" className="form-control" placeholder="Optional" />
                </label>
              </div>
              <label className="form-label">
                Role
                <select name="role" className="form-control" defaultValue="EMPLOYEE">
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs font-bold leading-5 text-boutique-charcoal/60">
                Uses Resend when RESEND_API_KEY and EMAIL_FROM are configured. Until then, the success message returns a manual invite link.
              </p>
            </AdminForm>
          </div>

          <div className="mt-3 space-y-3">
            {users.map((user: any) => (
              <div key={user.id} className="rounded-xl bg-zinc-50 p-3">
                <p className="font-black">{user.name}</p>
                <p className="break-all text-sm text-boutique-charcoal/65">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill tone="aqua">{user.role}</StatusPill>
                  <StatusPill>{user.status}</StatusPill>
                </div>
                {user.role !== "SUPER_ADMIN" && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <form action={updateAdminUserStatus} className="flex-1">
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="status" value={user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                      <button className="focus-ring w-full rounded-full border border-pink-100 bg-white px-3 py-2 text-xs font-black text-boutique-charcoal">
                        {user.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                    </form>
                    <form action={updateAdminUserStatus} className="flex-1">
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="status" value="DEACTIVATED" />
                      <button className="focus-ring w-full rounded-full bg-boutique-charcoal px-3 py-2 text-xs font-black text-white">
                        Deactivate
                      </button>
                    </form>
                  </div>
                )}
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
                <p className="text-sm text-boutique-charcoal/65">
                  {device.adminUser?.email ?? "Unassigned"} &middot; {device.ipAddress ?? "No IP"}
                </p>
                <p className="text-xs font-bold text-boutique-charcoal/45">
                  Last seen {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "never"}
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <StatusPill tone={device.status === "APPROVED" ? "aqua" : "neutral"}>{device.status}</StatusPill>
                  {device.status !== "REVOKED" && (
                    <form action={revokeTrustedDevice}>
                      <input type="hidden" name="id" value={device.id} />
                      <button className="focus-ring w-full rounded-full bg-boutique-charcoal px-3 py-2 text-xs font-black text-white sm:w-auto">
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
            {!devices.length && <p className="text-sm text-boutique-charcoal/60">No trusted devices recorded yet.</p>}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="font-black">Push subscriptions</h2>
          <div className="mt-3 space-y-3">
            <AdminPushManager publicKey={process.env.NEXT_PUBLIC_ADMIN_VAPID_PUBLIC_KEY} />
            {subscriptions.map((subscription: any) => (
              <div key={subscription.id} className="rounded-xl bg-zinc-50 p-3">
                <p className="truncate font-black">{subscription.endpoint}</p>
                <p className="text-sm text-boutique-charcoal/65">{subscription.adminUser?.email ?? "Unassigned"}</p>
                <StatusPill tone={subscription.enabled ? "aqua" : "neutral"}>{subscription.enabled ? "Enabled" : "Disabled"}</StatusPill>
              </div>
            ))}
            {!subscriptions.length && (
              <p className="text-sm text-boutique-charcoal/60">
                No admin push devices subscribed yet. Browser push delivery needs VAPID keys before production notifications can be sent.
              </p>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="font-black">Recent audit log</h2>
          <div className="mt-3 space-y-3">
            {logs.map((log: any) => (
              <div key={log.id} className="rounded-xl bg-zinc-50 p-3">
                <p className="font-black">{log.action}</p>
                <p className="text-sm text-boutique-charcoal/65">
                  {log.actor?.email ?? "System"} &middot; {log.entityType ?? "general"}
                </p>
              </div>
            ))}
            {!logs.length && <p className="text-sm text-boutique-charcoal/60">No audit activity recorded yet.</p>}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
