import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminMessages } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await getAdminMessages();
  return (
    <div>
      <AdminPageHeader title="Messages" eyebrow="Inbox" description="Customer contact messages and marketing consent status." />
      <div className="grid gap-3">
        {messages.map((message) => (
          <AdminCard key={message.id}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="font-black">{message.name}</p>
                <p className="text-sm text-boutique-charcoal/60">{message.email} {message.phone && `· ${message.phone}`}</p>
                <p className="mt-3 leading-7">{message.message}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <StatusPill tone="aqua">{formatDate(message.createdAt)}</StatusPill>
                <StatusPill tone={message.marketingConsent ? "pink" : "neutral"}>{message.marketingConsent ? "Marketing ok" : "Order contact only"}</StatusPill>
              </div>
            </div>
          </AdminCard>
        ))}
        {messages.length === 0 && <AdminCard><p className="text-sm text-boutique-charcoal/60">No messages yet.</p></AdminCard>}
      </div>
    </div>
  );
}
