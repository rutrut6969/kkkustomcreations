import { saveSettings } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div>
      <AdminPageHeader title="Site Settings" eyebrow="Business info" description="Manage business, contact, social, shipping, pickup, and dropoff copy." />
      <AdminForm action={saveSettings} submitLabel="Save site settings">
        <input type="hidden" name="settingsKeys" value="businessName,businessInfo,contactEmail,contactPhone,facebookUrl,facebookEmbedUrl,shippingText,pickupText,dropoffText" />
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
      </AdminForm>
    </div>
  );
}
