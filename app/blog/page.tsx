import Image from "next/image";
import Link from "next/link";
import { getBlogPosts } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <section className="container-page py-10">
      <div className="mb-7 max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Blog & Updates</p>
        <h1 className="text-4xl font-black">Fresh drops, custom notes, and market news</h1>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="overflow-hidden rounded-boutique border border-pink-100 bg-white shadow-soft transition hover:-translate-y-1">
            <div className="relative aspect-[16/9] bg-aqua-50">
              <Image src={post.featuredImage ?? "https://placehold.co/900x500/fff0f7/3d3d46?text=K%26K"} alt={post.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="p-5">
              <p className="text-sm font-bold text-aqua-700">{formatDate(post.publishedDate)}</p>
              <h2 className="mt-2 text-2xl font-black">{post.title}</h2>
              <p className="mt-3 leading-7 text-boutique-charcoal/75">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
