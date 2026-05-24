import "server-only";

import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import type { Category, MediaAsset, Product, ProductImage, ProductVariant } from "@prisma/client";

async function safe<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasDatabaseUrl()) return fallback;
  try {
    return await query();
  } catch (error) {
    console.warn("Admin database query failed; returning empty/default content:", error);
    return fallback;
  }
}

export async function getAdminMetrics() {
  if (!hasDatabaseUrl()) {
    return {
      totalProducts: 0,
      recentOrders: 0,
      pendingCustomRequests: 0,
      upcomingEvents: 0,
      recentMessages: 0,
      featuredProducts: 0
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
    totalProducts: 0,
    recentOrders: 0,
    pendingCustomRequests: 0,
    upcomingEvents: 0,
    recentMessages: 0,
    featuredProducts: 0
  });
}

export async function getAdminProducts(filter = "active") {
  const where =
    filter === "archived"
      ? { status: "ARCHIVED" as const, deletedAt: null }
      : filter === "draft"
        ? { status: "DRAFT" as const, deletedAt: null }
        : filter === "out-of-stock"
          ? { availability: "OUT_OF_STOCK" as const, deletedAt: null }
          : filter === "synced"
            ? { syncStatus: "SYNCED" as const, deletedAt: null }
            : filter === "not-synced"
              ? { syncStatus: { not: "SYNCED" as const }, deletedAt: null }
              : { status: { not: "ARCHIVED" as const }, deletedAt: null };
  return safe(
    () =>
      prisma.product.findMany({
        where,
        include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: true },
        orderBy: { updatedAt: "desc" }
      }),
    [] as Array<Product & { category: Category; images: ProductImage[]; variants: ProductVariant[] }>
  );
}

export async function getAdminCategories() {
  return safe(
    () => prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    [] as Array<Category & { _count: { products: number } }>
  );
}

export async function getAdminOrders(filter = "open") {
  const where =
    filter === "paid"
      ? { paymentStatus: "PAID" as const, archivedAt: null, deletedAt: null }
      : filter === "pending"
        ? { paymentStatus: "PENDING" as const, archivedAt: null, deletedAt: null }
        : filter === "completed"
          ? { status: "COMPLETED" as const, archivedAt: null, deletedAt: null }
          : filter === "canceled"
            ? { status: "CANCELED" as const, archivedAt: null, deletedAt: null }
            : filter === "archived"
              ? { archivedAt: { not: null }, deletedAt: null }
              : { archivedAt: null, deletedAt: null };
  return safe(
    () => prisma.order.findMany({ where, include: { items: true, customer: true }, orderBy: { createdAt: "desc" }, take: 50 }),
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
    [] as MediaAsset[]
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
  const settings = await safe(
    () => prisma.siteSetting.findMany({ where: { key: { in: ["squareLastSync"] } } }),
    []
  );
  const settingMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  return {
    environment,
    hasAccessToken: Boolean(process.env[`${prefix}_ACCESS_TOKEN`]),
    hasApplicationId: Boolean(process.env[`${prefix}_APPLICATION_ID`]),
    hasWebhookKey: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
    lastSync: settingMap.squareLastSync ?? "Not synced yet"
  };
}
