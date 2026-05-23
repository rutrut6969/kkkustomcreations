import Link from "next/link";
import { deleteEvent, saveEvent } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getEvents } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await getEvents();
  return (
    <div>
      <AdminPageHeader title="Events" eyebrow="Vendor calendar" description="Create compact event cards with featured toggles and Facebook links." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <AdminForm action={saveEvent} submitLabel="Create event">
          <input aria-label="Event title" name="title" placeholder="Event title" className="form-control" />
          <div className="grid gap-3 md:grid-cols-2">
            <input aria-label="Event date" name="date" type="date" className="form-control" />
            <input aria-label="Event time" name="time" placeholder="10 AM - 3 PM" className="form-control" />
          </div>
          <input aria-label="Location" name="location" placeholder="Location" className="form-control" />
          <textarea aria-label="Description" name="description" rows={4} placeholder="Event details" className="form-control" />
          <input aria-label="Facebook event link" name="facebookEventLink" placeholder="Facebook event link" className="form-control" />
          <label className="flex items-center gap-2 text-sm font-bold"><input name="featured" type="checkbox" className="h-4 w-4 accent-boutique-pink" /> Featured</label>
        </AdminForm>
        <div className="space-y-3">
          {events.map((event) => (
            <AdminCard key={event.id} className="p-0">
              <details>
                <summary className="grid cursor-pointer gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-black">{event.title}</p>
                    <p className="text-sm text-boutique-charcoal/60">{formatDate(event.date)} · {event.time} · {event.location}</p>
                  </div>
                  {event.featured && <StatusPill tone="pink">Featured</StatusPill>}
                </summary>
                <div className="border-t border-pink-100 p-4">
                  <AdminForm action={saveEvent} submitLabel="Update event">
                    <input type="hidden" name="id" value={event.id} />
                    <input aria-label="Event title" name="title" defaultValue={event.title} className="form-control" />
                    <div className="grid gap-3 md:grid-cols-2">
                      <input aria-label="Event date" name="date" type="date" defaultValue={event.date.toISOString().slice(0, 10)} className="form-control" />
                      <input aria-label="Event time" name="time" defaultValue={event.time} className="form-control" />
                    </div>
                    <input aria-label="Location" name="location" defaultValue={event.location} className="form-control" />
                    <textarea aria-label="Description" name="description" rows={3} defaultValue={event.description} className="form-control" />
                    <input aria-label="Facebook event link" name="facebookEventLink" defaultValue={event.facebookEventLink ?? ""} className="form-control" />
                    <label className="flex items-center gap-2 text-sm font-bold"><input name="featured" type="checkbox" defaultChecked={event.featured} className="h-4 w-4 accent-boutique-pink" /> Featured</label>
                    {event.facebookEventLink && <Link href={event.facebookEventLink} target="_blank" className="text-sm font-black text-aqua-700">Open Facebook event</Link>}
                  </AdminForm>
                  <form action={deleteEvent} className="mt-3">
                    <input type="hidden" name="id" value={event.id} />
                    <button className="text-sm font-black text-boutique-pink">Delete event</button>
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
