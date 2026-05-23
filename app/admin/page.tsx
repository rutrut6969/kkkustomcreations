import Link from "next/link";
import { logoutAdmin, saveAnnouncement, saveEvent, saveFeaturedProducts, savePost, saveSettings, deleteAnnouncement, deleteEvent, deletePost } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { getAnnouncements, getBlogPosts, getEvents, getProducts, getSettings } from "@/lib/data";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getAdminInbox() {
  if (!hasDatabaseUrl()) return [[], []] as const;
  try {
    return await Promise.all([
      prisma.customOrderRequest.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 6 })
    ]);
  } catch (error) {
    console.warn("Using empty admin inbox fallback:", error);
    return [[], []] as const;
  }
}

export default async function AdminPage() {
  const [settings, announcements, events, posts, products] = await Promise.all([
    getSettings(),
    getAnnouncements(true),
    getEvents(),
    getBlogPosts(true),
    getProducts()
  ]);
  const inbox = await getAdminInbox();

  return (
    <section className="container-page py-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Admin Portal</p>
          <h1 className="text-4xl font-black">Site management</h1>
        </div>
        <form action={logoutAdmin}>
          <button className="rounded-full border-2 border-aqua-300 bg-white px-4 py-2 text-sm font-black shadow-soft">Log out</button>
        </form>
      </div>

      {!hasDatabaseUrl() && (
        <div className="mb-6 rounded-boutique border border-pink-100 bg-boutique-blush p-4 text-sm font-bold text-boutique-pink shadow-soft">
          Demo mode: DATABASE_URL is not configured, so admin forms render but cannot persist changes.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminForm action={saveSettings} submitLabel="Save business settings">
          <h2 className="text-2xl font-black">Business and homepage settings</h2>
          <input aria-label="Business name" name="businessName" defaultValue={settings.businessName} placeholder="Business name" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <input aria-label="Homepage banner text" name="homepageBannerText" defaultValue={settings.homepageBannerText} placeholder="Homepage banner text" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <textarea aria-label="Business info" name="businessInfo" defaultValue={settings.businessInfo} rows={4} placeholder="Business info" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Contact email" name="contactEmail" defaultValue={settings.contactEmail} placeholder="Contact email" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
            <input aria-label="Contact phone" name="contactPhone" defaultValue={settings.contactPhone} placeholder="Contact phone" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          </div>
          <input aria-label="Facebook link" name="facebookUrl" defaultValue={settings.facebookUrl} placeholder="Facebook link" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <input aria-label="Facebook embed URL" name="facebookEmbedUrl" defaultValue={settings.facebookEmbedUrl} placeholder="Facebook embed URL" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <textarea aria-label="Shipping text" name="shippingText" defaultValue={settings.shippingText} rows={2} placeholder="Shipping text" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <textarea aria-label="Pickup text" name="pickupText" defaultValue={settings.pickupText} rows={2} placeholder="Pickup text" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <textarea aria-label="Dropoff text" name="dropoffText" defaultValue={settings.dropoffText} rows={2} placeholder="Dropoff text" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <label className="flex gap-3 text-sm font-bold">
            <input name="customOrdersEnabled" type="checkbox" defaultChecked={settings.customOrdersEnabled !== "false"} value="true" className="h-4 w-4 accent-boutique-pink" />
            Custom orders visible/open
          </label>
        </AdminForm>

        <div className="space-y-6">
          <AdminForm action={saveAnnouncement} submitLabel="Save announcement">
            <h2 className="text-2xl font-black">Homepage announcements</h2>
            <input aria-label="Announcement title" name="title" placeholder="Announcement title" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
            <textarea aria-label="Announcement body" name="body" rows={3} placeholder="Announcement body" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
            <label className="flex gap-3 text-sm font-bold"><input name="active" type="checkbox" defaultChecked className="h-4 w-4 accent-boutique-pink" /> Active</label>
          </AdminForm>
          <div className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
            <h3 className="font-black">Current announcements</h3>
            <div className="mt-3 space-y-3">
              {announcements.map((item) => (
                <div key={item.id} className="rounded-xl bg-boutique-blush p-3">
                  <AdminForm action={saveAnnouncement} submitLabel="Update">
                    <input type="hidden" name="id" value={item.id} />
                    <input aria-label="Announcement title" name="title" defaultValue={item.title} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                    <textarea aria-label="Announcement body" name="body" defaultValue={item.body} rows={2} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                    <label className="flex gap-3 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={item.active} className="h-4 w-4 accent-boutique-pink" /> Active</label>
                  </AdminForm>
                  <form action={deleteAnnouncement} className="mt-2">
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-sm font-black text-boutique-pink">Delete</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AdminForm action={saveEvent} submitLabel="Save event">
          <h2 className="text-2xl font-black">Vendor events</h2>
          <input aria-label="Event title" name="title" placeholder="Event title" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Event date" name="date" type="date" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
            <input aria-label="Event time" name="time" placeholder="Time" className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
          </div>
          <input aria-label="Event location" name="location" placeholder="Location" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <textarea aria-label="Event description" name="description" rows={3} placeholder="Description" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <input aria-label="Facebook event link" name="facebookEventLink" placeholder="Facebook event link" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <label className="flex gap-3 text-sm font-bold"><input name="featured" type="checkbox" className="h-4 w-4 accent-boutique-pink" /> Featured event</label>
        </AdminForm>

        <div className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black">Existing events</h2>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl bg-aqua-50 p-3">
                <AdminForm action={saveEvent} submitLabel="Update">
                  <input type="hidden" name="id" value={event.id} />
                  <input aria-label="Event title" name="title" defaultValue={event.title} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input aria-label="Event date" name="date" type="date" defaultValue={event.date.toISOString().slice(0, 10)} className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
                    <input aria-label="Event time" name="time" defaultValue={event.time} className="focus-ring rounded-xl border border-pink-100 px-4 py-3" />
                  </div>
                  <input aria-label="Event location" name="location" defaultValue={event.location} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <textarea aria-label="Event description" name="description" defaultValue={event.description} rows={2} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <input aria-label="Facebook event link" name="facebookEventLink" defaultValue={event.facebookEventLink ?? ""} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <label className="flex gap-3 text-sm font-bold"><input name="featured" type="checkbox" defaultChecked={event.featured} className="h-4 w-4 accent-boutique-pink" /> Featured event</label>
                </AdminForm>
                <form action={deleteEvent} className="mt-2">
                  <input type="hidden" name="id" value={event.id} />
                  <button className="text-sm font-black text-boutique-pink">Delete</button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <AdminForm action={savePost} submitLabel="Save blog post">
          <h2 className="text-2xl font-black">Blog/update posts</h2>
          <input aria-label="Post title" name="title" placeholder="Title" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <input aria-label="Post slug" name="slug" placeholder="Slug, optional" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <input aria-label="Post excerpt" name="excerpt" placeholder="Short excerpt" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <textarea aria-label="Post body" name="body" rows={6} placeholder="Body" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <input aria-label="Post published date" name="publishedDate" type="date" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <input aria-label="Featured image URL" name="featuredImage" placeholder="Featured image placeholder URL" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
          <select aria-label="Post status" name="status" className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3">
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </AdminForm>

        <div className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black">Existing posts</h2>
          <div className="mt-4 space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-xl bg-boutique-blush p-3">
                <AdminForm action={savePost} submitLabel="Update">
                  <input type="hidden" name="id" value={post.id} />
                  <input aria-label="Post title" name="title" defaultValue={post.title} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <input aria-label="Post slug" name="slug" defaultValue={post.slug} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <input aria-label="Post excerpt" name="excerpt" defaultValue={post.excerpt} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <textarea aria-label="Post body" name="body" defaultValue={post.body} rows={4} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <input aria-label="Post published date" name="publishedDate" type="date" defaultValue={post.publishedDate.toISOString().slice(0, 10)} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <input aria-label="Featured image URL" name="featuredImage" defaultValue={post.featuredImage ?? ""} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3" />
                  <select aria-label="Post status" name="status" defaultValue={post.status} className="focus-ring w-full rounded-xl border border-pink-100 px-4 py-3">
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                  <Link href={`/blog/${post.slug}`} className="text-sm font-black text-aqua-700">View post</Link>
                </AdminForm>
                <form action={deletePost} className="mt-2">
                  <input type="hidden" name="id" value={post.id} />
                  <button className="text-sm font-black text-boutique-pink">Delete</button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <form action={saveFeaturedProducts} className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft xl:col-span-2">
          <h2 className="text-2xl font-black">Featured product selections</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <label key={product.id} className="flex gap-3 rounded-xl bg-aqua-50 p-3 text-sm font-bold">
                <input type="checkbox" name="featured" value={product.id} defaultChecked={product.featured} className="mt-1 h-4 w-4 accent-boutique-pink" />
                <span>{product.name}</span>
              </label>
            ))}
          </div>
          <button className="focus-ring mt-4 rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink">Save featured products</button>
        </form>

        <div className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black">Recent custom requests</h2>
          <div className="mt-4 space-y-3">
            {inbox[0].map((request) => (
              <div key={request.id} className="rounded-xl bg-aqua-50 p-3 text-sm">
                <p className="font-black">{request.name} · {request.itemType}</p>
                <p>{request.email} · {request.phone}</p>
                <p className="mt-1">{request.designRequest}</p>
              </div>
            ))}
            {inbox[0].length === 0 && <p className="text-sm text-boutique-charcoal/65">No saved custom requests yet.</p>}
          </div>
        </div>

        <div className="rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black">Recent contact messages</h2>
          <div className="mt-4 space-y-3">
            {inbox[1].map((message) => (
              <div key={message.id} className="rounded-xl bg-boutique-blush p-3 text-sm">
                <p className="font-black">{message.name} · {message.email}</p>
                <p className="mt-1">{message.message}</p>
              </div>
            ))}
            {inbox[1].length === 0 && <p className="text-sm text-boutique-charcoal/65">No saved contact messages yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
