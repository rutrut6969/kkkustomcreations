import { deleteAnnouncement, saveAnnouncement } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAnnouncements } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const announcements = await getAnnouncements(true);
  return (
    <div>
      <AdminPageHeader title="Announcements" eyebrow="Homepage banner" description="Create short announcement messages shown on the storefront homepage." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <AdminForm action={saveAnnouncement} submitLabel="Create announcement">
          <input aria-label="Title" name="title" placeholder="Title" className="form-control" />
          <textarea aria-label="Body" name="body" rows={4} placeholder="Announcement body" className="form-control" />
          <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked className="h-4 w-4 accent-boutique-pink" /> Active</label>
        </AdminForm>
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <AdminCard key={announcement.id} className="p-0">
              <details>
                <summary className="grid cursor-pointer gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-black">{announcement.title}</p>
                    <p className="line-clamp-1 text-sm text-boutique-charcoal/60">{announcement.body}</p>
                  </div>
                  <StatusPill tone={announcement.active ? "aqua" : "neutral"}>{announcement.active ? "Active" : "Inactive"}</StatusPill>
                </summary>
                <div className="border-t border-pink-100 p-4">
                  <AdminForm action={saveAnnouncement} submitLabel="Update announcement">
                    <input type="hidden" name="id" value={announcement.id} />
                    <input aria-label="Title" name="title" defaultValue={announcement.title} className="form-control" />
                    <textarea aria-label="Body" name="body" rows={3} defaultValue={announcement.body} className="form-control" />
                    <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={announcement.active} className="h-4 w-4 accent-boutique-pink" /> Active</label>
                  </AdminForm>
                  <form action={deleteAnnouncement} className="mt-3">
                    <input type="hidden" name="id" value={announcement.id} />
                    <button className="text-sm font-black text-boutique-pink">Delete announcement</button>
                  </form>
                </div>
              </details>
            </AdminCard>
          ))}
        </div>
      </div>
    </div>
  );
}
