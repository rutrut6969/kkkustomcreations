"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import type { QuickAddDraft } from "@/lib/quick-add";

type QueueStatus = "needs_review" | "ready" | "publishing" | "published" | "error";

type QueueItem = {
  id: string;
  file: File;
  preview: string;
  draft: QuickAddDraft | null;
  status: QueueStatus;
  message?: string;
};

type AnalyzeResponse = {
  draft: QuickAddDraft;
  usedAi?: boolean;
  aiStatus?: "used_ai" | "missing_key" | "ai_error";
  warning?: string;
};

const emptyDraft: QuickAddDraft = {
  productTitle: "",
  suggestedCategory: "Custom Orders",
  price: "0.00",
  quantity: 0,
  shortDescription: "",
  description: "",
  tags: [],
  metaDescription: "",
  imageAltText: "",
  suggestedAvailability: "IN_STOCK"
};

function statusLabel(status: QueueStatus) {
  return status.replace("_", " ");
}

export function QuickAddProduct() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const readyCount = queue.filter((item) => item.status === "ready").length;
  const hasQueue = queue.length > 0;
  const allPublished = hasQueue && queue.every((item) => item.status === "published");
  const helperText = useMemo(
    () => "Use filenames like pink-glitter-tumbler_tumblers_pr25-00_q10.jpg. AI descriptions are optional; filename parsing always works.",
    []
  );

  async function analyzeFile(item: QueueItem) {
    const form = new FormData();
    form.set("image", item.file);
    const response = await fetch("/api/admin/quick-add/analyze", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not analyze product.");
    return data as AnalyzeResponse;
  }

  async function addFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (!accepted.length) {
      setMessage("Choose JPG, PNG, or WEBP images.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const items: QueueItem[] = accepted.map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      preview: URL.createObjectURL(file),
      draft: null,
      status: "needs_review"
    }));
    setQueue((current) => [...current, ...items]);

    for (const item of items) {
      try {
        const result = await analyzeFile(item);
        const itemMessage = result.usedAi
          ? "AI description generated. Review before publishing."
          : result.warning || "Filename draft created. AI was not used.";
        setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, draft: result.draft, status: "ready", message: itemMessage } : entry));
      } catch (error) {
        setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, draft: emptyDraft, status: "error", message: error instanceof Error ? error.message : "Analysis failed" } : entry));
      }
    }
    setLoading(false);
  }

  function updateDraft(id: string, patch: Partial<QuickAddDraft>) {
    setQueue((current) =>
      current.map((item) => item.id === id ? { ...item, draft: { ...(item.draft ?? emptyDraft), ...patch }, status: item.status === "published" ? item.status : "ready" } : item)
    );
  }

  function removeItem(id: string) {
    setQueue((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((entry) => entry.id !== id);
    });
  }

  async function publishItem(item: QueueItem) {
    if (!item.draft) throw new Error("Review details before publishing.");
    const formData = new FormData();
    formData.set("image", item.file);
    formData.set("name", item.draft.productTitle);
    formData.set("category", item.draft.suggestedCategory);
    formData.set("price", item.draft.price);
    formData.set("quantity", String(item.draft.quantity));
    formData.set("availability", item.draft.suggestedAvailability);
    formData.set("shortDescription", item.draft.shortDescription);
    formData.set("description", item.draft.description);
    formData.set("tags", item.draft.tags.join(", "));
    formData.set("metaDescription", item.draft.metaDescription);
    formData.set("altText", item.draft.imageAltText);
    const response = await fetch("/api/admin/quick-add/publish", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not publish product.");
    return data.syncWarning ? `Published with Square warning: ${data.syncWarning}` : "Published and synced.";
  }

  async function publishReadyItems() {
    setLoading(true);
    setMessage(null);
    for (const item of queue.filter((entry) => entry.status === "ready")) {
      setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "publishing", message: "Publishing..." } : entry));
      try {
        const success = await publishItem(item);
        setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "published", message: success } : entry));
      } catch (error) {
        setQueue((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "error", message: error instanceof Error ? error.message : "Publish failed" } : entry));
      }
    }
    setLoading(false);
    setMessage("Bulk publish finished. Failed items remain in the queue for review.");
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-black">Bulk upload product photos</h2>
            <p className="mt-2 text-sm leading-6 text-boutique-charcoal/65">{helperText}</p>
          </div>
          <button
            disabled={!readyCount || loading}
            onClick={publishReadyItems}
            className="focus-ring w-full rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink disabled:opacity-50 lg:w-auto"
          >
            {loading ? "Working..." : `Publish Products (${readyCount})`}
          </button>
        </div>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addFiles(event.dataTransfer.files);
          }}
          className="mt-4 grid cursor-pointer place-items-center rounded-2xl border border-dashed border-aqua-200 bg-aqua-50 p-6 text-center"
        >
          <UploadCloud className="text-aqua-700" aria-hidden="true" />
          <span className="mt-2 text-sm font-black">Choose or drag multiple JPG, PNG, or WEBP files</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => event.target.files && addFiles(event.target.files)} />
        </label>
        {message && <p className="mt-3 rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-charcoal">{message}</p>}
        {allPublished && <p className="mt-3 rounded-xl bg-aqua-50 p-3 text-sm font-bold text-aqua-700">All queued products have published.</p>}
      </section>

      <div className="grid gap-3">
        {queue.map((item, index) => {
          const draft = item.draft ?? emptyDraft;
          return (
            <details key={item.id} open={item.status !== "published"} className="overflow-hidden rounded-boutique border border-pink-100 bg-white shadow-soft">
              <summary className="grid cursor-pointer gap-3 p-4 md:grid-cols-[72px_1fr_auto] md:items-center">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-aqua-50">
                  <Image src={item.preview} alt={draft.imageAltText || item.file.name} fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black">{draft.productTitle || item.file.name}</p>
                  <p className="text-sm text-boutique-charcoal/60">#{index + 1} · {item.file.name} · {draft.suggestedCategory} · ${draft.price} · qty {draft.quantity}</p>
                  {item.message && <p className="mt-1 text-xs font-bold text-boutique-charcoal/50">{item.message}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === "error" ? "bg-boutique-blush text-boutique-pink" : "bg-aqua-50 text-aqua-700"}`}>
                  {statusLabel(item.status)}
                </span>
              </summary>
              <div className="grid gap-4 border-t border-pink-100 p-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="form-label">Title<input className="form-control" value={draft.productTitle} onChange={(event) => updateDraft(item.id, { productTitle: event.target.value })} /></label>
                  <label className="form-label">Category<input className="form-control" value={draft.suggestedCategory} onChange={(event) => updateDraft(item.id, { suggestedCategory: event.target.value })} /></label>
                  <label className="form-label">Price<input className="form-control" value={draft.price} onChange={(event) => updateDraft(item.id, { price: event.target.value })} /></label>
                  <label className="form-label">Quantity<input className="form-control" type="number" value={draft.quantity} onChange={(event) => updateDraft(item.id, { quantity: Number(event.target.value) })} /></label>
                </div>
                <label className="form-label">Short description<input className="form-control" value={draft.shortDescription} onChange={(event) => updateDraft(item.id, { shortDescription: event.target.value })} /></label>
                <label className="form-label">Description<textarea className="form-control" rows={5} value={draft.description} onChange={(event) => updateDraft(item.id, { description: event.target.value })} /></label>
                <label className="form-label">Tags<input className="form-control" value={draft.tags.join(", ")} onChange={(event) => updateDraft(item.id, { tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
                <label className="form-label">SEO/meta description<input className="form-control" value={draft.metaDescription} onChange={(event) => updateDraft(item.id, { metaDescription: event.target.value })} /></label>
                <label className="form-label">Image alt text<input className="form-control" value={draft.imageAltText} onChange={(event) => updateDraft(item.id, { imageAltText: event.target.value })} /></label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => removeItem(item.id)} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full border border-pink-100 px-4 py-2 text-sm font-black text-boutique-pink sm:w-auto">
                    <Trash2 size={16} aria-hidden="true" />
                    Discard item
                  </button>
                  {item.status === "publishing" && <p className="inline-flex items-center gap-2 text-sm font-black text-aqua-700"><Loader2 size={16} className="animate-spin" /> Publishing...</p>}
                </div>
              </div>
            </details>
          );
        })}
        {!hasQueue && <p className="rounded-boutique border border-pink-100 bg-white p-5 text-sm font-bold text-boutique-charcoal/60 shadow-soft">No pending products yet.</p>}
      </div>
    </div>
  );
}
