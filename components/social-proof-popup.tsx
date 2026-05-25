"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { SocialProofView } from "@/lib/types";

type ActivePopup = {
  item: SocialProofView;
  mode: "bottom" | "queue";
  key: string;
};

const popupDurationMs = 7000;

export function SocialProofPopup({ purchases }: { purchases: SocialProofView[] }) {
  const [liveItems, setLiveItems] = useState<SocialProofView[]>(purchases);
  const [queue, setQueue] = useState<SocialProofView[]>([]);
  const [active, setActive] = useState<ActivePopup | null>(null);
  const items = useMemo(() => liveItems.filter((item) => item.productSlug), [liveItems]);
  const activeRef = useRef<ActivePopup | null>(null);
  const queueRef = useRef<SocialProofView[]>([]);
  const lastProductSlugRef = useRef<string | undefined>(undefined);
  const cycleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLiveItems(purchases);
  }, [purchases]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const selectNextSample = useCallback(() => {
    if (!items.length) return null;
    const alternatives = items.filter((item) => item.productSlug !== lastProductSlugRef.current);
    const selectable = alternatives.length ? alternatives : items;
    return selectable[Math.floor(Math.random() * selectable.length)];
  }, [items]);

  const showPopup = useCallback((item: SocialProofView, mode: ActivePopup["mode"]) => {
    lastProductSlugRef.current = item.productSlug;
    setActive({ item, mode, key: `${mode}-${item.id}-${Date.now()}` });
    if (cycleTimerRef.current) window.clearTimeout(cycleTimerRef.current);
    cycleTimerRef.current = window.setTimeout(() => {
      setActive(null);
      setQueue((current) => {
        const [next, ...rest] = current;
        if (next) window.setTimeout(() => showPopup(next, "queue"), 80);
        return rest;
      });
    }, popupDurationMs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch("/api/social-proof", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const nextItems = Array.isArray(data.purchases) ? data.purchases.filter((item: SocialProofView) => item.productSlug) : [];
        if (!nextItems.length || cancelled) return;
        setLiveItems((existing) => {
          const existingIds = new Set(existing.map((item) => item.id));
          const queuedIds = new Set(queueRef.current.map((item) => item.id));
          const activeId = activeRef.current?.item.id;
          const newRealItems = nextItems.filter((item: SocialProofView) => !item.isSample && !existingIds.has(item.id) && !queuedIds.has(item.id) && item.id !== activeId);
          if (newRealItems.length) {
            setQueue((current) => [...current, ...newRealItems]);
            if (!activeRef.current) {
              const [first, ...rest] = newRealItems;
              setQueue((current) => current.filter((item) => item.id !== first.id && !rest.some((restItem: SocialProofView) => restItem.id === item.id)).concat(rest));
              window.setTimeout(() => showPopup(first, "queue"), 80);
            }
          }
          const merged = [...newRealItems, ...nextItems, ...existing];
          return Array.from(new Map(merged.map((item) => [item.id, item])).values()).slice(0, 32);
        });
      } catch {
        // Social proof should never interrupt browsing.
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [showPopup]);

  useEffect(() => {
    if (!items.length) return;
    const showSample = () => {
      if (activeRef.current || queueRef.current.length) return;
      const next = selectNextSample();
      if (next) showPopup(next, "bottom");
    };
    const initial = window.setTimeout(showSample, 1800 + Math.random() * 2200);
    const interval = window.setInterval(showSample, 22000 + Math.random() * 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      if (cycleTimerRef.current) window.clearTimeout(cycleTimerRef.current);
    };
  }, [items.length, selectNextSample, showPopup]);

  if (!items.length || !active) return null;

  const href = active.item.productSlug ? `/shop/${active.item.productSlug}` : active.item.fallbackUrl ?? "/shop";

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-50 max-w-[calc(100vw-1.5rem)] sm:bottom-6 sm:left-6 sm:max-w-sm">
      <Link
        key={active.key}
        href={href}
        className={`${active.mode === "queue" ? "social-proof-queue-cycle" : "social-proof-bottom-cycle"} pointer-events-auto flex cursor-pointer items-center gap-3 rounded-boutique border border-pink-100 bg-white p-3 pr-4 text-sm shadow-pink transition hover:-translate-y-1 hover:border-boutique-pink hover:shadow-soft focus-ring`}
        title="View this product"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-aqua-100 text-boutique-pink">
          <Sparkles size={18} />
        </span>
        <span>
          <span className="font-black">{active.item.customerName}</span> purchased{" "}
          <span className="font-black text-boutique-pink">{active.item.productName}</span>.
          {active.item.isSample && <span className="block text-xs text-boutique-charcoal/55">Popular item</span>}
        </span>
      </Link>
    </div>
  );
}
