import { saveSettings } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-ui";
import { getSettings } from "@/lib/data";
import { parseShippingSettings } from "@/lib/shipping";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const shipping = parseShippingSettings(settings);
  return (
    <div>
      <AdminPageHeader title="Site Settings" eyebrow="Business info" description="Manage business, contact, social, shipping, pickup, and dropoff copy." />
      <AdminForm action={saveSettings} submitLabel="Save site settings">
        <input
          type="hidden"
          name="settingsKeys"
          value="businessName,businessInfo,contactEmail,contactPhone,facebookUrl,facebookEmbedUrl,shippingText,pickupText,dropoffText,shippingEnabled,flatShippingRate,freeShippingThreshold,localPickupEnabled,localDropoffEnabled,localDropoffFee,salesTaxRatePercent,shippingCheckoutMessage"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="form-label">Business name<input name="businessName" defaultValue={settings.businessName} className="form-control" /></label>
          <label className="form-label">Contact email<input name="contactEmail" defaultValue={settings.contactEmail} className="form-control" /></label>
          <label className="form-label">Contact phone<input name="contactPhone" defaultValue={settings.contactPhone} className="form-control" /></label>
          <label className="form-label">Facebook URL<input name="facebookUrl" defaultValue={settings.facebookUrl} className="form-control" /></label>
          <label className="form-label lg:col-span-2">Facebook embed URL<input name="facebookEmbedUrl" defaultValue={settings.facebookEmbedUrl} className="form-control" /></label>
          <label className="form-label lg:col-span-2">Business info<textarea name="businessInfo" rows={4} defaultValue={settings.businessInfo} className="form-control" /></label>
          <label className="form-label">Shipping text<textarea name="shippingText" rows={3} defaultValue={settings.shippingText} className="form-control" /></label>
          <label className="form-label">Pickup text<textarea name="pickupText" rows={3} defaultValue={settings.pickupText} className="form-control" /></label>
          <label className="form-label lg:col-span-2">Dropoff text<textarea name="dropoffText" rows={3} defaultValue={settings.dropoffText} className="form-control" /></label>
        </div>
        <AdminCard className="mt-5 bg-aqua-50/60">
          <h2 className="text-lg font-black">Shipping and fulfillment fees</h2>
          <p className="mt-1 text-sm font-bold text-boutique-charcoal/60">Flat-rate MVP settings. Future carrier/live-rate integrations can build on these fields.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm font-bold shadow-sm">
              <input name="shippingEnabled" type="checkbox" defaultChecked={shipping.shippingEnabled} className="mt-1 h-5 w-5 shrink-0 accent-boutique-pink" />
              <span>Enable shipping</span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm font-bold shadow-sm">
              <input name="localPickupEnabled" type="checkbox" defaultChecked={shipping.localPickupEnabled} className="mt-1 h-5 w-5 shrink-0 accent-boutique-pink" />
              <span>Enable local pickup</span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm font-bold shadow-sm">
              <input name="localDropoffEnabled" type="checkbox" defaultChecked={shipping.localDropoffEnabled} className="mt-1 h-5 w-5 shrink-0 accent-boutique-pink" />
              <span>Enable local dropoff</span>
            </label>
            <label className="form-label">
              Flat shipping rate
              <input name="flatShippingRate" type="number" min="0" step="0.01" defaultValue={(shipping.flatShippingRateCents / 100).toFixed(2)} className="form-control" />
            </label>
            <label className="form-label">
              Free shipping threshold
              <input name="freeShippingThreshold" type="number" min="0" step="0.01" defaultValue={shipping.freeShippingThresholdCents ? (shipping.freeShippingThresholdCents / 100).toFixed(2) : ""} placeholder="Optional" className="form-control" />
            </label>
            <label className="form-label">
              Local dropoff fee
              <input name="localDropoffFee" type="number" min="0" step="0.01" defaultValue={shipping.localDropoffFeeCents ? (shipping.localDropoffFeeCents / 100).toFixed(2) : ""} placeholder="Optional" className="form-control" />
            </label>
            <label className="form-label">
              Sales tax percentage
              <input name="salesTaxRatePercent" type="number" min="0" max="25" step="0.001" defaultValue={shipping.salesTaxRatePercent} className="form-control" />
            </label>
            <label className="form-label lg:col-span-3">
              Checkout shipping message
              <textarea name="shippingCheckoutMessage" rows={3} defaultValue={shipping.shippingCheckoutMessage} className="form-control" />
            </label>
          </div>
        </AdminCard>
      </AdminForm>
    </div>
  );
}
