import "server-only";

import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import type { Category, Customer, MediaAsset, Product, ProductImage, ProductVariant } from "@prisma/client";

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
      activeProducts: 0,
      archivedProducts: 0,
      draftProducts: 0,
      recentOrders: 0,
      paidOrders: 0,
      pendingOrders: 0,
      pendingCustomRequests: 0,
      upcomingEvents: 0,
      recentMessages: 0,
      unreadMessages: 0,
      featuredProducts: 0,
      lowStockItems: 0,
      customers: 0,
      marketingOptIns: 0
    };
  }
  return safe(async () => {
    const [
      totalProducts,
      activeProducts,
      archivedProducts,
      draftProducts,
      recentOrders,
      paidOrders,
      pendingOrders,
      pendingCustomRequests,
      upcomingEvents,
      recentMessages,
      featuredProducts,
      lowStockItems,
      customers,
      marketingOptIns
    ] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.product.count({ where: { status: "ARCHIVED", deletedAt: null } }),
      prisma.product.count({ where: { status: "DRAFT", deletedAt: null } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.count({ where: { paymentStatus: "PAID", deletedAt: null } }),
      prisma.order.count({ where: { paymentStatus: "PENDING", deletedAt: null } }),
      prisma.customOrderRequest.count({ where: { archived: false, status: { notIn: ["COMPLETED", "ARCHIVED"] } } }),
      prisma.event.count({ where: { date: { gte: new Date() } } }),
      prisma.contactMessage.count(),
      prisma.product.count({ where: { featured: true, deletedAt: null } }),
      prisma.product.count({ where: { availability: { in: ["LOW_STOCK", "OUT_OF_STOCK"] }, deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      (prisma.customer as any).count({ where: { marketingConsent: true, deletedAt: null } })
    ]);
    return {
      totalProducts,
      activeProducts,
      archivedProducts,
      draftProducts,
      recentOrders,
      paidOrders,
      pendingOrders,
      pendingCustomRequests,
      upcomingEvents,
      recentMessages,
      unreadMessages: recentMessages,
      featuredProducts,
      lowStockItems,
      customers,
      marketingOptIns
    };
  }, {
    totalProducts: 0,
    activeProducts: 0,
    archivedProducts: 0,
    draftProducts: 0,
    recentOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    pendingCustomRequests: 0,
    upcomingEvents: 0,
    recentMessages: 0,
    unreadMessages: 0,
    featuredProducts: 0,
    lowStockItems: 0,
    customers: 0,
    marketingOptIns: 0
  });
}

export async function getAdminProducts(filter = "active") {
  const where =
    filter === "archived"
      ? { status: "ARCHIVED" as const, deletedAt: null }
      : filter === "draft"
        ? { status: "DRAFT" as const, deletedAt: null }
        : filter === "low-stock"
          ? { availability: "LOW_STOCK" as const, deletedAt: null }
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
    [] as any[]
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

export async function getAdminCustomers(filter = "all") {
  const where =
    filter === "marketing"
      ? { marketingConsent: true, deletedAt: null }
    : filter === "repeat"
        ? { orders: { some: {} }, deletedAt: null }
        : filter === "high-value"
          ? { totalSpentCents: { gte: 10000 }, deletedAt: null }
          : filter === "recent"
            ? { lastOrderAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }, deletedAt: null }
            : filter === "archived"
              ? { archivedAt: { not: null }, deletedAt: null }
              : filter === "imported"
                ? {
                    deletedAt: null,
                    OR: [
                      { name: { in: ["Square customer", "Square order"] } },
                      { AND: [{ email: null }, { phone: null }] }
                    ]
                  }
              : { archivedAt: null, deletedAt: null };

  return safe(
    () =>
      (prisma.customer as any).findMany({
        where,
        include: { _count: { select: { orders: true } } },
        orderBy: [{ lastOrderAt: "desc" }, { updatedAt: "desc" }],
        take: 200
      }),
    [] as Array<Customer & { _count: { orders: number } }>
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
