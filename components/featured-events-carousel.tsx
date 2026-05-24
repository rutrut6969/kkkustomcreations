"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import type { EventView } from "@/lib/types";
import { ButtonLink } from "@/components/button-link";

export function FeaturedEventsCarousel({ events }: { events: EventView[] }) {
  const featuredEvents = useMemo(() => events.filter((event) => event.featured), [events]);
  const [index, setIndex] = useState(0);

  if (!featuredEvents.length) return null;

  const event = featuredEvents[index % featuredEvents.length];
  const hasMultiple = featuredEvents.length > 1;

  return (
    <section className="container-page rounded-boutique border border-aqua-100 bg-aqua-50 p-5 shadow-soft md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Featured events</p>
          <h2 className="text-2xl font-black">{event.title}</h2>
        </div>
        {hasMultiple && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous featured event"
              onClick={() => setIndex((current) => (current - 1 + featuredEvents.length) % featuredEvents.length)}
              className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-white text-boutique-charcoal shadow-soft"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next featured event"
              onClick={() => setIndex((current) => (current + 1) % featuredEvents.length)}
              className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-white text-boutique-charcoal shadow-soft"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-boutique-charcoal/75">
            <CalendarDays size={17} aria-hidden="true" className="text-boutique-pink" />
            <span>{formatDate(event.date)} · {event.time}</span>
          </p>
          <p className="flex flex-wrap items-center gap-2 text-boutique-charcoal/75">
            <MapPin size={17} aria-hidden="true" className="text-boutique-pink" />
            <span>{event.location}</span>
          </p>
          <p className="max-w-2xl leading-7 text-boutique-charcoal/75">{event.description}</p>
          {event.facebookEventLink && (
            <Link href={event.facebookEventLink} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-black text-boutique-pink hover:underline">
              Facebook event
            </Link>
          )}
        </div>
        <ButtonLink href="/events" variant="secondary">See events</ButtonLink>
      </div>

      {hasMultiple && (
        <div className="mt-5 flex gap-2">
          {featuredEvents.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              onClick={() => setIndex(dotIndex)}
              className={`h-2.5 rounded-full transition-all ${dotIndex === index ? "w-8 bg-boutique-pink" : "w-2.5 bg-white"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
