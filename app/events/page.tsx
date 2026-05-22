import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { getEvents } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <section className="container-page py-10">
      <div className="mb-7 max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Events</p>
        <h1 className="text-4xl font-black">Vendor markets and local pop-ups</h1>
        <p className="mt-3 leading-7 text-boutique-charcoal/75">Find K&K Kustom Kreations at local events, vendor malls, and seasonal markets.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
            {event.featured && <span className="rounded-full bg-boutique-blush px-3 py-1 text-xs font-black text-boutique-pink">Featured</span>}
            <h2 className="mt-3 text-2xl font-black">{event.title}</h2>
            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-aqua-700"><CalendarDays size={17} /> {formatDate(event.date)} · {event.time}</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold"><MapPin size={17} /> {event.location}</p>
            <p className="mt-4 leading-7 text-boutique-charcoal/75">{event.description}</p>
            {event.facebookEventLink && (
              <Link href={event.facebookEventLink} className="mt-4 inline-flex rounded-full border-2 border-aqua-300 px-4 py-2 text-sm font-black" target="_blank">
                Facebook event
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
