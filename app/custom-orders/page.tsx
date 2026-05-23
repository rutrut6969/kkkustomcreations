import { Upload } from "lucide-react";
import { submitCustomOrder } from "@/app/actions";
import { ManagedForm } from "@/components/form-status";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomOrdersPage() {
  const settings = await getSettings();
  const enabled = settings.customOrdersEnabled !== "false";

  return (
    <section className="container-page grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Custom Orders</p>
        <h1 className="mt-2 text-4xl font-black">Tell us what you want to make magical</h1>
        <p className="mt-4 leading-8 text-boutique-charcoal/75">
          Send your idea for a tumbler, pen, keychain, badge reel, wristlet, seasonal gift, or something totally custom.
          Inspiration photos can be shared after we reply.
        </p>
        <div className="mt-6 rounded-boutique bg-aqua-50 p-5 text-sm leading-7 shadow-soft">
          <p className="font-black">Current custom order status</p>
          <p>{enabled ? "Custom order requests are open." : "Custom requests are currently paused, but you can still send a message."}</p>
        </div>
      </div>
      <ManagedForm action={submitCustomOrder} submitLabel="Submit custom request">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-label">
            Name
            <input name="name" required autoComplete="name" placeholder="Jane Smith" className="form-control" />
          </label>
          <label className="form-label">
            Email
            <input name="email" type="email" required autoComplete="email" placeholder="jane@example.com" className="form-control" />
          </label>
          <label className="form-label">
            Phone
            <input name="phone" required autoComplete="tel" placeholder="555-123-4567" className="form-control" />
          </label>
          <label className="form-label">
            Item type
            <select name="itemType" required className="form-control">
              <option value="">Choose an item type</option>
              <option>Tumbler</option>
              <option>Pen</option>
              <option>Keychain</option>
              <option>Badge Reel</option>
              <option>Wristlet</option>
              <option>Seasonal</option>
              <option>Other Custom Product</option>
            </select>
          </label>
        </div>
        <label className="form-label">
          Design request
          <textarea name="designRequest" required rows={6} placeholder="Colors, theme, name, and any must-have details" className="form-control" />
        </label>
        <label className="form-label">
          Needed-by date
          <input name="neededBy" type="date" className="form-control" />
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-aqua-300 bg-aqua-50 px-4 py-4 text-sm font-bold">
          <Upload size={18} className="text-boutique-pink" />
          <span>Image upload placeholder: mention inspiration images here for Phase 1</span>
          <input name="imageNote" className="sr-only" value="Customer may provide inspiration image after follow-up." readOnly />
        </label>
        <label className="flex gap-3 text-sm leading-6">
          <input name="consent" required type="checkbox" className="mt-1 h-4 w-4 accent-boutique-pink" />
          <span>I consent to K&K Kustom Kreations contacting me about my order, custom request, pickup/dropoff, and related business updates.</span>
        </label>
      </ManagedForm>
    </section>
  );
}
