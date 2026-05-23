import { saveCustomOrderAdmin } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminCustomOrders } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const statuses = ["NEW", "REVIEWING", "AWAITING_CUSTOMER", "IN_PROGRESS", "COMPLETED", "ARCHIVED"];

export default async function AdminCustomOrdersPage() {
  const requests = await getAdminCustomOrders();
  return (
    <div>
      <AdminPageHeader title="Custom Orders" eyebrow="Requests" description="Review customer design requests, track status, images, and internal notes." />
      <div className="space-y-3">
        {requests.map((request) => (
          <AdminCard key={request.id} className="p-0">
            <details>
              <summary className="grid cursor-pointer gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-black">{request.name} · {request.itemType}</p>
                  <p className="text-sm text-boutique-charcoal/60">{request.email} · {request.phone} · {formatDate(request.createdAt)}</p>
                </div>
                <StatusPill tone={request.status === "NEW" ? "pink" : "aqua"}>{request.status.replaceAll("_", " ")}</StatusPill>
              </summary>
              <div className="grid gap-4 border-t border-pink-100 p-4 lg:grid-cols-[1fr_360px]">
                <div className="space-y-3 text-sm leading-6">
                  <p><span className="font-black">Request:</span> {request.designRequest}</p>
                  <p><span className="font-black">Needed by:</span> {request.neededBy ? formatDate(request.neededBy) : "Flexible"}</p>
                  <p><span className="font-black">Image note:</span> {request.imageNote ?? "None"}</p>
                  {request.imageUrl && <a href={request.imageUrl} className="font-black text-boutique-pink" target="_blank">View uploaded/reference image</a>}
                </div>
                <AdminForm action={saveCustomOrderAdmin} submitLabel="Update request">
                  <input type="hidden" name="id" value={request.id} />
                  <select aria-label="Request status" name="status" defaultValue={request.status} className="form-control">
                    {statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                  </select>
                  <input aria-label="Image URL" name="imageUrl" defaultValue={request.imageUrl ?? ""} placeholder="Image/reference URL" className="form-control" />
                  <textarea aria-label="Internal notes" name="internalNotes" rows={5} defaultValue={request.internalNotes ?? ""} placeholder="Internal notes" className="form-control" />
                  <label className="flex items-center gap-2 text-sm font-bold"><input name="archived" type="checkbox" defaultChecked={request.archived} className="h-4 w-4 accent-boutique-pink" /> Archived</label>
                </AdminForm>
              </div>
            </details>
          </AdminCard>
        ))}
        {requests.length === 0 && <AdminCard><p className="text-sm text-boutique-charcoal/60">No custom order requests yet.</p></AdminCard>}
      </div>
    </div>
  );
}
