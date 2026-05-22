import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBlogPostBySlug } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug);
  if (!post || post.status !== "PUBLISHED") notFound();

  return (
    <article className="container-page max-w-3xl py-10">
      <Link href="/blog" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-boutique-pink">
        <ArrowLeft size={16} /> Back to updates
      </Link>
      <p className="text-sm font-bold text-aqua-700">{formatDate(post.publishedDate)}</p>
      <h1 className="mt-2 text-4xl font-black">{post.title}</h1>
      <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-boutique bg-aqua-50 shadow-soft">
        <Image src={post.featuredImage ?? "https://placehold.co/900x500/fff0f7/3d3d46?text=K%26K"} alt={post.title} fill sizes="100vw" className="object-cover" />
      </div>
      <div className="prose prose-zinc mt-8 max-w-none leading-8 text-boutique-charcoal/80">
        {post.body.split("\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>
  );
}
