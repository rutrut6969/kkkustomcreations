import Image from "next/image";
import { deleteMediaAsset, saveMediaAsset } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getAdminMedia } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const assets = await getAdminMedia();
  return (
    <div>
      <AdminPageHeader title="Media Library" eyebrow="Assets" description="Upload by URL for Phase 1, then reuse images for products, posts, and events. Drag/drop storage can plug in later." />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <AdminForm action={saveMediaAsset} submitLabel="Add media asset">
          <input aria-label="File name" name="fileName" placeholder="File name" className="form-control" />
          <input aria-label="Media URL" name="url" placeholder="Image or file URL" className="form-control" />
          <input aria-label="Alt text" name="altText" placeholder="Alt text" className="form-control" />
          <select aria-label="Asset type" name="assetType" className="form-control">
            <option value="IMAGE">Image</option>
            <option value="DOCUMENT">Document</option>
            <option value="OTHER">Other</option>
          </select>
          <input aria-label="MIME type" name="mimeType" placeholder="image/jpeg" className="form-control" />
        </AdminForm>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <AdminCard key={asset.id} className="overflow-hidden p-0">
              <div className="relative aspect-[4/3] bg-aqua-50">
                {asset.assetType === "IMAGE" ? <Image src={asset.url} alt={asset.altText ?? asset.fileName} fill sizes="(min-width: 1280px) 20vw, 50vw" className="object-cover" /> : <div className="grid h-full place-items-center font-black">File</div>}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate font-black">{asset.fileName}</p>
                <StatusPill tone="aqua">{asset.assetType}</StatusPill>
                <p className="break-all text-xs text-boutique-charcoal/60">{asset.url}</p>
                {!asset.id.startsWith("sample-") && (
                  <form action={deleteMediaAsset}>
                    <input type="hidden" name="id" value={asset.id} />
                    <button className="text-sm font-black text-boutique-pink">Delete</button>
                  </form>
                )}
              </div>
            </AdminCard>
          ))}
        </div>
      </div>
    </div>
  );
}
