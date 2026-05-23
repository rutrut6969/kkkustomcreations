import Link from "next/link";
import { deletePost, savePost } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/admin-ui";
import { getBlogPosts } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = await getBlogPosts(true);
  return (
    <div>
      <AdminPageHeader title="Blog Posts" eyebrow="CMS" description="Manage published and draft update posts with compact expandable cards." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <AdminForm action={savePost} submitLabel="Create post">
          <input aria-label="Title" name="title" placeholder="Title" className="form-control" />
          <input aria-label="Slug" name="slug" placeholder="Slug optional" className="form-control" />
          <input aria-label="Excerpt" name="excerpt" placeholder="Short excerpt" className="form-control" />
          <textarea aria-label="Body" name="body" rows={6} placeholder="Post body" className="form-control" />
          <input aria-label="Published date" name="publishedDate" type="date" className="form-control" />
          <input aria-label="Featured image" name="featuredImage" placeholder="Featured image URL" className="form-control" />
          <select aria-label="Status" name="status" className="form-control">
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </AdminForm>
        <div className="space-y-3">
          {posts.map((post) => (
            <AdminCard key={post.id} className="p-0">
              <details>
                <summary className="grid cursor-pointer gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-black">{post.title}</p>
                    <p className="text-sm text-boutique-charcoal/60">{formatDate(post.publishedDate)} · /{post.slug}</p>
                  </div>
                  <StatusPill tone={post.status === "PUBLISHED" ? "aqua" : "neutral"}>{post.status}</StatusPill>
                </summary>
                <div className="border-t border-pink-100 p-4">
                  <AdminForm action={savePost} submitLabel="Update post">
                    <input type="hidden" name="id" value={post.id} />
                    <input aria-label="Title" name="title" defaultValue={post.title} className="form-control" />
                    <input aria-label="Slug" name="slug" defaultValue={post.slug} className="form-control" />
                    <input aria-label="Excerpt" name="excerpt" defaultValue={post.excerpt} className="form-control" />
                    <textarea aria-label="Body" name="body" rows={5} defaultValue={post.body} className="form-control" />
                    <input aria-label="Published date" name="publishedDate" type="date" defaultValue={post.publishedDate.toISOString().slice(0, 10)} className="form-control" />
                    <input aria-label="Featured image" name="featuredImage" defaultValue={post.featuredImage ?? ""} className="form-control" />
                    <select aria-label="Status" name="status" defaultValue={post.status} className="form-control">
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                    <Link href={`/blog/${post.slug}`} className="text-sm font-black text-aqua-700">View post</Link>
                  </AdminForm>
                  <form action={deletePost} className="mt-3">
                    <input type="hidden" name="id" value={post.id} />
                    <button className="text-sm font-black text-boutique-pink">Delete post</button>
                  </form>
                </div>
              </details>
            </AdminCard>
          ))}
        </div>
      </div>
    </div>
  );
}
