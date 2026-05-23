import Link from "next/link";
import { submitContactMessage } from "@/app/actions";
import { ManagedForm } from "@/components/form-status";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <section className="container-page grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Contact</p>
        <h1 className="mt-2 text-4xl font-black">Questions, pickups, dropoffs, and custom ideas</h1>
        <div className="mt-6 space-y-3 rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
          <p><span className="font-black">Email:</span> {settings.contactEmail}</p>
          <p><span className="font-black">Phone:</span> {settings.contactPhone}</p>
          {settings.facebookUrl && <Link href={settings.facebookUrl} target="_blank" className="font-black text-boutique-pink">Facebook page</Link>}
        </div>
      </div>
      <ManagedForm action={submitContactMessage} submitLabel="Send message">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-label">
            Name
            <input name="name" required autoComplete="name" placeholder="Jane Smith" className="form-control" />
          </label>
          <label className="form-label">
            Email
            <input name="email" type="email" required autoComplete="email" placeholder="jane@example.com" className="form-control" />
          </label>
        </div>
        <label className="form-label">
          Phone
          <input name="phone" autoComplete="tel" placeholder="555-123-4567" className="form-control" />
        </label>
        <label className="form-label">
          Message
          <textarea name="message" required rows={6} placeholder="How can we help?" className="form-control" />
        </label>
        <label className="flex gap-3 text-sm leading-6">
          <input name="consent" required type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" />
          <span>I consent to K&K Kustom Kreations contacting me about my order, custom request, pickup/dropoff, and related business updates.</span>
        </label>
        <label className="flex gap-3 text-sm leading-6">
          <input name="marketingConsent" type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" />
          <span>I would like to receive updates about new products, events, and promotions.</span>
        </label>
      </ManagedForm>
    </section>
  );
}
