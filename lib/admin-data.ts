import "server-only";

import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { sampleCategories, sampleEvents, samplePosts, sampleProducts, sampleSettings } from "@/lib/sample-data";

async function safe<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasDatabaseUrl()) return fallback;
  try {
    return await query();
  } catch (error) {
    console.warn("Using admin fallback:", error);
    return fallback;
  }
}

export async function getAdminMetrics() {
  if (!hasDatabaseUrl()) {
    return {
      totalProducts: sampleProducts.length,
      recentOrders: 2,
      pendingCustomRequests: 0,
      upcomingEvents: sampleEvents.length,
      recentMessages: 0,
      featuredProducts: sampleProducts.filter((product) => product.featured).length
    };
  }
  return safe(async () => {
    const [totalProducts, recentOrders, pendingCustomRequests, upcomingEvents, recentMessages, featuredProducts] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.customOrderRequest.count({ where: { archived: false, status: { notIn: ["COMPLETED", "ARCHIVED"] } } }),
      prisma.event.count({ where: { date: { gte: new Date() } } }),
      prisma.contactMessage.count(),
      prisma.product.count({ where: { featured: true } })
    ]);
    return { totalProducts, recentOrders, pendingCustomRequests, upcomingEvents, recentMessages, featuredProducts };
  }, {
    totalProducts: sampleProducts.length,
    recentOrders: 0,
    pendingCustomRequests: 0,
    upcomingEvents: sampleEvents.length,
    recentMessages: 0,
    featuredProducts: sampleProducts.filter((product) => product.featured).length
  });
}

export async function getAdminProducts() {
  return safe(
    () =>
      prisma.product.findMany({
        include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: true },
        orderBy: { updatedAt: "desc" }
      }),
    sampleProducts.map((product) => ({
      ...product,
      categoryId: product.category.id,
      category: { ...product.category, createdAt: new Date(), updatedAt: new Date(), sortOrder: 0, bannerImageUrl: null, visible: true },
      images: [],
      variants: [],
      status: "ACTIVE" as const,
      squareCatalogId: null,
      squareVersion: null,
      squareUpdatedAt: null,
      lastSyncedAt: null,
      syncStatus: "NOT_SYNCED" as const,
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      shortDescription: product.description,
      salePriceCents: null,
      madeToOrder: product.availability === "MADE_TO_ORDER",
      tags: []
    }) as any)
  );
}

export async function getAdminCategories() {
  return safe(
    () => prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    sampleCategories.map((category, index) => ({
      ...category,
      description: category.description ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      bannerImageUrl: null,
      visible: true,
      sortOrder: index,
      squareCatalogId: null,
      squareVersion: null,
      squareUpdatedAt: null,
      lastSyncedAt: null,
      syncStatus: "NOT_SYNCED" as const,
      syncError: null,
      _count: { products: sampleProducts.filter((product) => product.category.slug === category.slug).length }
    }) as any)
  );
}

export async function getAdminOrders() {
  return safe(
    () => prisma.order.findMany({ include: { items: true, customer: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    []
  );
}

export async function getAdminCustomOrders() {
  return safe(
    () => prisma.customOrderRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    []
  );
}

export async function getAdminMessages() {
  return safe(
    () => prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    []
  );
}

export async function getAdminMedia() {
  return safe(
    () => prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } }),
    sampleProducts.slice(0, 4).map((product) => ({
      id: `sample-${product.id}`,
      fileName: product.name,
      url: product.imageUrl,
      altText: product.name,
      assetType: "IMAGE" as const,
      mimeType: "image/jpeg",
      sizeBytes: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  );
}

export async function getAdminActivity() {
  return safe(async () => {
    const [orders, customOrders, messages] = await Promise.all([
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.customOrderRequest.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    ]);
    return { orders, customOrders, messages };
  }, { orders: [], customOrders: [], messages: [] });
}

export async function getIntegrationStatus() {
  const environment = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const prefix = environment === "production" ? "SQUARE_PRODUCTION" : "SQUARE_SANDBOX";
  return {
    environment,
    hasAccessToken: Boolean(process.env[`${prefix}_ACCESS_TOKEN`]),
    hasApplicationId: Boolean(process.env[`${prefix}_APPLICATION_ID`]),
    hasWebhookKey: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
    lastSync: sampleSettings.squareLastSync ?? "Not synced yet"
  };
}
