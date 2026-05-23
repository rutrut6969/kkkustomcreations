import "server-only";

import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { sampleAnnouncements, sampleCategories, sampleEvents, samplePosts, sampleProducts, sampleSettings, sampleSocialProof } from "@/lib/sample-data";

async function fromDb<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasDatabaseUrl()) return fallback;
  try {
    return await query();
  } catch (error) {
    console.warn("Using sample data fallback:", error);
    return fallback;
  }
}

export async function getSettings() {
  return fromDb(async () => {
    const settings = await prisma.siteSetting.findMany();
    return settings.reduce<Record<string, string>>((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, { ...sampleSettings });
  }, sampleSettings);
}

export async function getAnnouncements(includeInactive = false) {
  return fromDb(
    () => prisma.announcement.findMany({ where: includeInactive ? undefined : { active: true }, orderBy: { createdAt: "desc" } }),
    includeInactive ? sampleAnnouncements : sampleAnnouncements.filter((announcement) => announcement.active)
  );
}

export async function getCategories() {
  return fromDb(() => prisma.category.findMany({ orderBy: { name: "asc" } }), sampleCategories);
}

export async function getProducts() {
  return fromDb(
    () =>
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: { category: true },
        orderBy: [{ featured: "desc" }, { name: "asc" }]
      }),
    sampleProducts
  );
}

export async function getFeaturedProducts() {
  const products = await getProducts();
  return products.filter((product) => product.featured).slice(0, 4);
}

export async function getProductBySlug(slug: string) {
  const product = await fromDb(
    () =>
      prisma.product.findUnique({
        where: { slug },
        include: { category: true }
      }),
    sampleProducts.find((item) => item.slug === slug) ?? null
  );
  return product;
}

export async function getRelatedProducts(categorySlug: string, currentSlug: string) {
  const products = await getProducts();
  return products.filter((product) => product.category.slug === categorySlug && product.slug !== currentSlug).slice(0, 3);
}

export async function getEvents() {
  return fromDb(() => prisma.event.findMany({ orderBy: [{ featured: "desc" }, { date: "asc" }] }), sampleEvents);
}

export async function getBlogPosts(includeDrafts = false) {
  return fromDb(
    () =>
      prisma.blogPost.findMany({
        where: includeDrafts ? undefined : { status: "PUBLISHED" },
        orderBy: { publishedDate: "desc" }
      }),
    includeDrafts ? samplePosts : samplePosts.filter((post) => post.status === "PUBLISHED")
  );
}

export async function getBlogPostBySlug(slug: string) {
  return fromDb(
    () => prisma.blogPost.findUnique({ where: { slug } }),
    samplePosts.find((post) => post.slug === slug) ?? null
  );
}

export async function getSocialProofPurchases() {
  return fromDb(
    async () => {
      const purchases = await prisma.socialProofPurchase.findMany({
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
        take: 12
      });
      return purchases.map((purchase) => ({
        id: purchase.id,
        customerName: purchase.customerName,
        productName: purchase.productName,
        productSlug: purchase.product?.availability === "OUT_OF_STOCK" ? undefined : purchase.product?.slug,
        fallbackUrl: purchase.product?.availability === "OUT_OF_STOCK" ? `/shop?category=${purchase.product.category.slug}` : purchase.fallbackUrl,
        isSample: purchase.isSample
      }));
    },
    sampleSocialProof
  );
}
