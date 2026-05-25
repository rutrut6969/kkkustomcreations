import "server-only";

import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import type { Announcement, BlogPost, Category, Event, Product } from "@prisma/client";
import type { SocialProofView } from "@/lib/types";

const defaultSettings: Record<string, string> = {
  businessName: "K&K Kustom Kreations",
  homepageBannerText: "",
  businessInfo: "",
  contactEmail: "",
  contactPhone: "",
  facebookUrl: "",
  facebookEmbedUrl: "",
  shippingText: "",
  pickupText: "",
  dropoffText: "",
  customOrdersEnabled: "true"
};

function isProductionBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

async function fromDb<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasDatabaseUrl() || isProductionBuildPhase()) return fallback;
  try {
    return await query();
  } catch (error) {
    console.warn("Database query failed; returning empty/default content:", error);
    return fallback;
  }
}

export async function getSettings() {
  return fromDb(async () => {
    const settings = await prisma.siteSetting.findMany();
    return settings.reduce<Record<string, string>>((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, { ...defaultSettings });
  }, defaultSettings);
}

export async function getAnnouncements(includeInactive = false) {
  return fromDb(
    () => prisma.announcement.findMany({ where: includeInactive ? undefined : { active: true }, orderBy: { createdAt: "desc" } }),
    [] as Announcement[]
  );
}

export async function getCategories() {
  return fromDb(() => prisma.category.findMany({ orderBy: { name: "asc" } }), [] as Category[]);
}

export async function getProducts() {
  return fromDb(
    () =>
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: { category: true },
        orderBy: [{ featured: "desc" }, { name: "asc" }]
      }),
    [] as Array<Product & { category: Category }>
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
    null as (Product & { category: Category }) | null
  );
  return product;
}

export async function getRelatedProducts(categorySlug: string, currentSlug: string) {
  const products = await getProducts();
  return products.filter((product) => product.category.slug === categorySlug && product.slug !== currentSlug).slice(0, 3);
}

export async function getEvents() {
  return fromDb(() => prisma.event.findMany({ orderBy: [{ featured: "desc" }, { date: "asc" }] }), [] as Event[]);
}

export async function getBlogPosts(includeDrafts = false) {
  return fromDb(
    () =>
      prisma.blogPost.findMany({
        where: includeDrafts ? undefined : { status: "PUBLISHED" },
        orderBy: { publishedDate: "desc" }
      }),
    [] as BlogPost[]
  );
}

export async function getBlogPostBySlug(slug: string) {
  return fromDb(
    () => prisma.blogPost.findUnique({ where: { slug } }),
    null as BlogPost | null
  );
}

export async function getSocialProofPurchases() {
  if (!hasDatabaseUrl() || isProductionBuildPhase()) return [];
  try {
    const purchases = await prisma.socialProofPurchase.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      take: 12
    });
    const validPurchases = purchases.filter(
      (purchase) =>
        purchase.product &&
        purchase.product.status === "ACTIVE" &&
        !purchase.product.archivedAt &&
        !purchase.product.deletedAt &&
        ["IN_STOCK", "LOW_STOCK", "MADE_TO_ORDER"].includes(purchase.product.availability)
    );
    if (validPurchases.length) {
      return validPurchases.map((purchase) => ({
        id: purchase.id,
        customerName: purchase.customerName,
        productName: purchase.product?.name ?? purchase.productName,
        productSlug: purchase.product?.slug,
        fallbackUrl: `/shop?category=${purchase.product?.category.slug}`,
        isSample: purchase.isSample,
        createdAt: purchase.createdAt.toISOString()
      }));
    }

    const activeProducts = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        archivedAt: null,
        deletedAt: null,
        availability: { in: ["IN_STOCK", "LOW_STOCK", "MADE_TO_ORDER"] }
      },
      include: { category: true },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 8
    });
    const names = ["Avery", "Morgan", "Taylor", "Jordan", "Riley", "Casey", "Jamie", "Alex"];
    return activeProducts.map((product, index) => ({
      id: `generated-${product.id}`,
      customerName: names[index % names.length],
      productName: product.name,
      productSlug: product.slug,
      fallbackUrl: `/shop?category=${product.category.slug}`,
      isSample: true,
      createdAt: new Date(Date.now() - index * 60_000).toISOString()
    }));
  } catch (error) {
    console.warn("Database query failed; returning empty social proof:", error);
    return [] as SocialProofView[];
  }
}
