"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import type { QuickAddDraft } from "@/lib/quick-add";

export function QuickAddProduct() {
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<QuickAddDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    const form = new FormData();
    form.set("image", file);
    const response = await fetch("/api/admin/quick-add/analyze", { method: "POST", body: form });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Could not analyze product.");
      return;
    }
    setDraft(data.draft);
    setMessage(data.usedAi ? "AI draft created. Review before publishing." : "Filename draft created. Review before publishing.");
  }

  async function publish(formData: FormData) {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    formData.set("image", file);
    const response = await fetch("/api/admin/quick-add/publish", { method: "POST", body: formData });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Could not publish product.");
      return;
    }
    window.location.href = data.url ?? "/admin/products";
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
        <h2 className="font-black">Upload product photo</h2>
        <p className="mt-2 text-sm leading-6 text-boutique-charcoal/65">Use filenames like product-name_category_pr25-00_q10.jpg. Product details are drafted only for review.</p>
        <label className="mt-4 grid cursor-pointer place-items-center rounded-2xl border border-dashed border-aqua-200 bg-aqua-50 p-6 text-center">
          <UploadCloud className="text-aqua-700" aria-hidden="true" />
          <span className="mt-2 text-sm font-black">Choose JPG, PNG, or WEBP</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setDraft(null);
            }}
          />
        </label>
        {preview && <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl bg-aqua-50"><Image src={preview} alt="Quick add preview" fill sizes="320px" className="object-cover" /></div>}
        <button disabled={!file || loading} onClick={analyze} className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink disabled:opacity-50">
          {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Analyze for review
        </button>
        {message && <p className="mt-3 rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-charcoal">{message}</p>}
      </section>

      <form action={publish} className="admin-form grid gap-4 rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
        <h2 className="font-black">Review and publish</h2>
        {!draft && <p className="text-sm text-boutique-charcoal/60">Upload and analyze a photo to create an editable product draft.</p>}
        {draft && (
          <>
            <input name="name" className="form-control" defaultValue={draft.productTitle} aria-label="Product title" />
            <div className="grid gap-3 lg:grid-cols-3">
              <input name="category" className="form-control" defaultValue={draft.suggestedCategory} aria-label="Category" />
              <input name="price" className="form-control" defaultValue={draft.price} aria-label="Price" />
              <input name="quantity" className="form-control" type="number" defaultValue={draft.quantity} aria-label="Quantity" />
            </div>
            <select name="availability" className="form-control" defaultValue={draft.suggestedAvailability} aria-label="Availability">
              <option value="IN_STOCK">In stock</option>
              <option value="LOW_STOCK">Low stock</option>
              <option value="MADE_TO_ORDER">Made to order</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </select>
            <input name="shortDescription" className="form-control" defaultValue={draft.shortDescription} aria-label="Short description" />
            <textarea name="description" className="form-control" rows={6} defaultValue={draft.description} aria-label="Description" />
            <input name="tags" className="form-control" defaultValue={draft.tags.join(", ")} aria-label="Tags" />
            <input name="metaDescription" className="form-control" defaultValue={draft.metaDescription} aria-label="Meta description" />
            <input name="altText" className="form-control" defaultValue={draft.imageAltText} aria-label="Image alt text" />
            <div className="flex flex-wrap gap-4 text-sm font-bold">
              <label className="flex items-center gap-2"><input name="featured" type="checkbox" className="h-4 w-4 accent-boutique-pink" /> Featured</label>
              <label className="flex items-center gap-2"><input name="madeToOrder" type="checkbox" className="h-4 w-4 accent-boutique-pink" /> Made to order</label>
            </div>
            <p className="rounded-xl bg-aqua-50 p-3 text-sm font-bold text-aqua-700">Publishing automatically attempts Square catalog and inventory sync. Any sync warning stays visible on the product record.</p>
            <button disabled={loading} className="focus-ring w-full rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink sm:w-auto">Publish product</button>
          </>
        )}
      </form>
    </div>
  );
}
