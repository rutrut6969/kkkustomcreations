import "server-only";

import { Prisma, SquareSyncStatus } from "@prisma/client";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { resolveLocationId, squareConfig } from "@/lib/square";
import { hasUsableCustomerInfo } from "@/lib/anti-bot";

type SquareCatalogObject = {
  type: string;
  id: string;
  version?: number | string;
  updated_at?: string;
  is_deleted?: boolean;
  category_data?: {
    name?: string;
  };
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    categories?: { id: string }[];
    category_id?: string;
    variations?: SquareCatalogObject[];
  };
  item_variation_data?: {
    name?: string;
    sku?: string;
    item_id?: string;
    price_money?: { amount?: number; currency?: string };
    track_inventory?: boolean;
  };
  image_data?: {
    name?: string;
    url?: string;
    caption?: string;
  };
};

type SquareOrder = {
  id: string;
  version?: number | string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  total_money?: { amount?: number };
  net_amount_due_money?: { amount?: number };
  line_items?: {
    name?: string;
    quantity?: string;
    base_price_money?: { amount?: number };
    total_money?: { amount?: number };
    catalog_object_id?: string;
    note?: string;
  }[];
  fulfillments?: {
    type?: string;
    pickup_details?: { recipient?: SquareRecipient };
    shipment_details?: { recipient?: SquareRecipient };
  }[];
  tenders?: { id?: string; type?: string }[];
};

type SquareRecipient = {
  display_name?: string;
  email_address?: string;
  phone_number?: string;
  address?: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
  };
};

function version(value: unknown) {
  return value === undefined || value === null ? null : String(value);
}

function asDate(value?: string) {
  return value ? new Date(value) : null;
}

export async function squareRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = squareConfig();
  if (!config.accessToken) {
    throw new Error(`Missing Square configuration: SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_ACCESS_TOKEN`);
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2025-04-16",
      Authorization: `Bearer ${config.accessToken}`,
      ...(init?.headers ?? {})
    }
  });
  const result = await response.json();
  if (!response.ok) {
    const message = Array.isArray(result.errors) ? result.errors.map((error: { detail?: string }) => error.detail).join(" ") : "Square request failed.";
    throw new Error(message || "Square request failed.");
  }
  return result as T;
}

async function activeLocationId() {
  const config = squareConfig();
  const locationId = await resolveLocationId(config);
  if (!locationId) {
    throw new Error(`Missing Square configuration: SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_LOCATION_ID`);
  }
  return locationId;
}

export async function writeSquareSyncLog(action: string, status: SquareSyncStatus, message?: string, metadata?: Record<string, unknown>) {
  if (!hasDatabaseUrl()) return null;
  return prisma.squareSyncLog.create({
    data: { action, status, message, metadata: metadata as Prisma.InputJsonValue | undefined }
  });
}

export async function setSquareSetting(key: string, value: string) {
  if (!hasDatabaseUrl()) return;
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
}

export async function getSquareSyncDashboard() {
  const environment = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const prefix = environment === "production" ? "SQUARE_PRODUCTION" : "SQUARE_SANDBOX";
  const fallback = {
    environment,
    hasAccessToken: Boolean(process.env[`${prefix}_ACCESS_TOKEN`]),
    hasApplicationId: Boolean(process.env[`${prefix}_APPLICATION_ID`]),
    hasLocationId: Boolean(process.env[`${prefix}_LOCATION_ID`]),
    hasSandboxToken: Boolean(process.env.SQUARE_SANDBOX_ACCESS_TOKEN),
    hasSandboxApplicationId: Boolean(process.env.SQUARE_SANDBOX_APPLICATION_ID),
    hasSandboxLocationId: Boolean(process.env.SQUARE_SANDBOX_LOCATION_ID),
    hasProductionToken: Boolean(process.env.SQUARE_PRODUCTION_ACCESS_TOKEN),
    hasProductionApplicationId: Boolean(process.env.SQUARE_PRODUCTION_APPLICATION_ID),
    hasProductionLocationId: Boolean(process.env.SQUARE_PRODUCTION_LOCATION_ID),
    hasWebhookKey: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
    lastCatalogPull: "Not synced yet",
    lastCategoryPush: "Not synced yet",
    lastOrderImport: "Not synced yet",
    lastSuccessfulCheckout: "Not recorded yet",
    lastInventoryAdjustment: "Not adjusted yet",
    recentLogs: [] as { id: string; action: string; status: SquareSyncStatus; message: string | null; createdAt: Date }[]
  };
  if (!hasDatabaseUrl()) return fallback;
  const [settings, recentLogs] = await Promise.all([
    prisma.siteSetting.findMany({ where: { key: { in: ["squareLastCatalogPull", "squareLastOrderImport", "squareLastCategoryPush", "squareLastSuccessfulCheckout", "squareLastInventoryAdjustment"] } } }),
    prisma.squareSyncLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
  ]);
  const settingMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  return {
    ...fallback,
    lastCatalogPull: settingMap.squareLastCatalogPull ?? fallback.lastCatalogPull,
    lastCategoryPush: settingMap.squareLastCategoryPush ?? fallback.lastCategoryPush,
    lastOrderImport: settingMap.squareLastOrderImport ?? fallback.lastOrderImport,
    lastSuccessfulCheckout: settingMap.squareLastSuccessfulCheckout ?? fallback.lastSuccessfulCheckout,
    lastInventoryAdjustment: settingMap.squareLastInventoryAdjustment ?? fallback.lastInventoryAdjustment,
    recentLogs
  };
}

async function listCatalogObjects() {
  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;
  do {
  const query = new URLSearchParams({ types: "ITEM,CATEGORY,IMAGE" });
    if (cursor) query.set("cursor", cursor);
    const result = await squareRequest<{ objects?: SquareCatalogObject[]; cursor?: string }>(`/v2/catalog/list?${query.toString()}`);
    objects.push(...(result.objects ?? []));
    cursor = result.cursor;
  } while (cursor);
  return objects.filter((object) => !object.is_deleted);
}

async function upsertSquareCategory(object: SquareCatalogObject) {
  const name = object.category_data?.name?.trim();
  if (!name) return null;
  const slug = slugify(name);
  const existing = await prisma.category.findFirst({
    where: { OR: [{ squareCatalogId: object.id }, { slug }, { name: { equals: name, mode: "insensitive" } }] }
  });
  const data = {
    name,
    slug,
    squareCatalogId: object.id,
    squareVersion: version(object.version),
    squareUpdatedAt: asDate(object.updated_at),
    lastSyncedAt: new Date(),
    syncStatus: SquareSyncStatus.SYNCED,
    syncError: null
  };
  if (existing) {
    return prisma.category.update({ where: { id: existing.id }, data });
  }
  return prisma.category.create({ data: { ...data, description: "Imported from Square.", visible: true } });
}

async function categoryForSquareId(squareCategoryId?: string) {
  if (squareCategoryId) {
    const category = await prisma.category.findFirst({ where: { squareCatalogId: squareCategoryId } });
    if (category) return category;
  }
  return prisma.category.findFirst({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

async function upsertSquareItem(object: SquareCatalogObject, imagesById = new Map<string, SquareCatalogObject>()) {
  const item = object.item_data;
  const name = item?.name?.trim();
  if (!name) return null;
  const firstVariation = item?.variations?.[0];
  const priceCents = firstVariation?.item_variation_data?.price_money?.amount ?? 0;
  const tracksInventory = firstVariation?.item_variation_data?.track_inventory !== false;
  const squareCategoryId = item?.categories?.[0]?.id ?? item?.category_id;
  const category = await categoryForSquareId(squareCategoryId);
  if (!category) throw new Error(`Cannot import ${name}: no local category exists.`);
  const squareImageUrl = item?.image_ids
    ?.map((id) => imagesById.get(id)?.image_data?.url)
    .find(Boolean);

  const slug = slugify(name);
  const existing = await prisma.product.findFirst({
    where: { OR: [{ squareCatalogId: object.id }, { slug }] },
    include: { variants: true }
  });
  const data = {
    name,
    slug,
    description: item?.description || "Imported from Square.",
    shortDescription: item?.description?.slice(0, 160) || null,
    priceCents,
    imageUrl: squareImageUrl ?? existing?.imageUrl ?? "/placeholder-product.svg",
    stock: tracksInventory ? existing?.stock ?? 0 : existing?.stock ?? 0,
    categoryId: category.id,
    status: "ACTIVE" as const,
    availability: tracksInventory ? existing?.availability ?? "IN_STOCK" as const : "MADE_TO_ORDER" as const,
    madeToOrder: !tracksInventory,
    squareCatalogId: object.id,
    squareVersion: version(object.version),
    squareUpdatedAt: asDate(object.updated_at),
    lastSyncedAt: new Date(),
    syncStatus: SquareSyncStatus.SYNCED,
    syncError: null
  };
  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data })
    : await prisma.product.create({ data });

  await prisma.productImage.upsert({
    where: { id: `${product.id}-primary` },
    create: { id: `${product.id}-primary`, productId: product.id, url: product.imageUrl, alt: product.name },
    update: { url: product.imageUrl, alt: product.name }
  });

  for (const variation of item?.variations ?? []) {
    const variationData = variation.item_variation_data;
    const variantName = variationData?.name || "Regular";
    const existingVariant = await prisma.productVariant.findFirst({
      where: { OR: [{ squareCatalogId: variation.id }, { productId: product.id, name: "Square", value: variantName }] }
    });
    const variantData = {
      productId: product.id,
      name: "Square",
      value: variantName,
      priceDeltaCents: Math.max(0, (variationData?.price_money?.amount ?? priceCents) - priceCents),
      sku: variationData?.sku || null,
      squareCatalogId: variation.id,
      squareVersion: version(variation.version),
      lastSyncedAt: new Date(),
      syncStatus: SquareSyncStatus.SYNCED,
      syncError: null
    };
    if (existingVariant) await prisma.productVariant.update({ where: { id: existingVariant.id }, data: variantData });
    else await prisma.productVariant.create({ data: variantData });
  }
  return product;
}

export async function pullSquareCatalogIntoWebsite() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square catalog sync.");
  try {
    await writeSquareSyncLog("catalog.pull", SquareSyncStatus.PENDING, "Pulling Square catalog.");
    const objects = await listCatalogObjects();
    for (const object of objects.filter((item) => item.type === "CATEGORY")) {
      await upsertSquareCategory(object);
    }
    for (const object of objects.filter((item) => item.type === "ITEM")) {
      const imagesById = new Map(objects.filter((item) => item.type === "IMAGE").map((item) => [item.id, item]));
      await upsertSquareItem(object, imagesById);
    }
    const message = `Imported ${objects.filter((item) => item.type === "ITEM").length} products and ${objects.filter((item) => item.type === "CATEGORY").length} categories from Square.`;
    await setSquareSetting("squareLastCatalogPull", new Date().toLocaleString());
    await writeSquareSyncLog("catalog.pull", SquareSyncStatus.SYNCED, message, { count: objects.length });
    return message;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Square catalog pull failed.";
    await writeSquareSyncLog("catalog.pull", SquareSyncStatus.ERROR, message);
    throw error;
  }
}

export async function pullSquareCategoriesIntoWebsite() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square category sync.");
  try {
    await writeSquareSyncLog("categories.pull", SquareSyncStatus.PENDING, "Pulling Square categories.");
    const objects = (await listCatalogObjects()).filter((item) => item.type === "CATEGORY");
    for (const object of objects) {
      await upsertSquareCategory(object);
    }
    const message = `Imported ${objects.length} categories from Square.`;
    await setSquareSetting("squareLastCategoryPull", new Date().toLocaleString());
    await writeSquareSyncLog("categories.pull", SquareSyncStatus.SYNCED, message, { count: objects.length });
    return message;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Square category pull failed.";
    await writeSquareSyncLog("categories.pull", SquareSyncStatus.ERROR, message);
    throw error;
  }
}

export async function pushCategoryToSquare(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Category not found.");
  try {
    await prisma.category.update({ where: { id: category.id }, data: { syncStatus: SquareSyncStatus.PENDING, syncError: null } });
    const object: SquareCatalogObject = {
      type: "CATEGORY",
      id: category.squareCatalogId ?? `#kk_category_${category.id}`,
      version: category.squareVersion ? Number(category.squareVersion) : undefined,
      category_data: { name: category.name }
    };
    const result = await squareRequest<{ catalog_object: SquareCatalogObject }>("/v2/catalog/object", {
      method: "POST",
      body: JSON.stringify({ idempotency_key: crypto.randomUUID(), object })
    });
    await prisma.category.update({
      where: { id: category.id },
      data: {
        squareCatalogId: result.catalog_object.id,
        squareVersion: version(result.catalog_object.version),
        squareUpdatedAt: asDate(result.catalog_object.updated_at),
        lastSyncedAt: new Date(),
        syncStatus: SquareSyncStatus.SYNCED,
        syncError: null
      }
    });
    await writeSquareSyncLog("category.push", SquareSyncStatus.SYNCED, `Pushed ${category.name} to Square.`, { categoryId });
    return result.catalog_object;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Category sync failed.";
    await prisma.category.update({ where: { id: categoryId }, data: { syncStatus: SquareSyncStatus.ERROR, syncError: message } }).catch(() => undefined);
    await writeSquareSyncLog("category.push", SquareSyncStatus.ERROR, message, { categoryId });
    throw error;
  }
}

export async function pushAllCategoriesToSquare() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square category sync.");
  const categories = await prisma.category.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  for (const category of categories) {
    await pushCategoryToSquare(category.id);
  }
  const message = `Pushed ${categories.length} visible categories to Square.`;
  await setSquareSetting("squareLastCategoryPush", new Date().toLocaleString());
  await writeSquareSyncLog("categories.pushAll", SquareSyncStatus.SYNCED, message, { count: categories.length });
  return message;
}

export async function syncCategoryRelationships(categoryId?: string) {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square relationship sync.");
  const products = await prisma.product.findMany({
    where: {
      status: { not: "ARCHIVED" },
      ...(categoryId ? { categoryId } : {})
    },
    select: { id: true }
  });
  for (const product of products) {
    await pushProductToSquare(product.id);
  }
  const message = `Synced Square category relationships for ${products.length} products.`;
  await writeSquareSyncLog("categories.relationships", SquareSyncStatus.SYNCED, message, { categoryId, count: products.length });
  return message;
}

export async function archiveCategoryInSquare(categoryId: string) {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square category sync.");
  const category = await prisma.category.findUnique({ where: { id: categoryId }, include: { _count: { select: { products: true } } } });
  if (!category) throw new Error("Category not found.");
  try {
    if (category.squareCatalogId && category._count.products === 0) {
      await squareRequest(`/v2/catalog/object/${category.squareCatalogId}`, { method: "DELETE" });
      await writeSquareSyncLog("category.delete", SquareSyncStatus.SYNCED, `Deleted unused category ${category.name} in Square.`, { categoryId });
    } else if (category.squareCatalogId) {
      await writeSquareSyncLog("category.delete", SquareSyncStatus.SKIPPED, `Skipped Square delete for ${category.name} because products still use it.`, { categoryId, products: category._count.products });
    }
    await prisma.category.update({
      where: { id: categoryId },
      data: {
        visible: false,
        syncStatus: category._count.products === 0 ? SquareSyncStatus.SYNCED : SquareSyncStatus.SKIPPED,
        syncError: category._count.products === 0 ? null : "Square delete skipped because products still use this category.",
        lastSyncedAt: new Date()
      }
    });
    if (category._count.products > 0) await syncCategoryRelationships(categoryId);
    return category._count.products === 0 ? `Hid ${category.name} locally and deleted it in Square.` : `Hid ${category.name} locally. Square delete skipped because products still use it.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Category archive sync failed.";
    await prisma.category.update({ where: { id: categoryId }, data: { syncStatus: SquareSyncStatus.ERROR, syncError: message } }).catch(() => undefined);
    await writeSquareSyncLog("category.delete", SquareSyncStatus.ERROR, message, { categoryId });
    throw error;
  }
}

export async function pushProductToSquare(productId: string) {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square product sync.");
  try {
    await prisma.product.update({ where: { id: productId }, data: { syncStatus: SquareSyncStatus.PENDING, syncError: null } });
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, variants: true }
    });
    if (!product) throw new Error("Product not found.");
    let squareCategoryId = product.category.squareCatalogId;
    if (!squareCategoryId) {
      const squareCategory = await pushCategoryToSquare(product.category.id);
      squareCategoryId = squareCategory.id;
    }

    const variants = product.variants.length
      ? product.variants
      : [{ id: `${product.id}-regular`, name: "Style", value: "Regular", priceDeltaCents: 0, stock: product.stock, sku: null, squareCatalogId: null, squareVersion: null }];
    const object: SquareCatalogObject = {
      type: "ITEM",
      id: product.squareCatalogId ?? `#kk_product_${product.id}`,
      version: product.squareVersion ? Number(product.squareVersion) : undefined,
      item_data: {
        name: product.name,
        description: product.description,
        categories: squareCategoryId ? [{ id: squareCategoryId }] : undefined,
        variations: variants.map((variant) => ({
          type: "ITEM_VARIATION",
          id: variant.squareCatalogId ?? `#kk_variation_${variant.id}`,
          version: variant.squareVersion ? Number(variant.squareVersion) : undefined,
          item_variation_data: {
            item_id: product.squareCatalogId ?? `#kk_product_${product.id}`,
            name: variant.value || "Regular",
            sku: variant.sku ?? undefined,
            track_inventory: !product.madeToOrder && product.availability !== "MADE_TO_ORDER",
            price_money: {
              amount: (product.salePriceCents ?? product.priceCents) + variant.priceDeltaCents,
              currency: "USD"
            }
          }
        }))
      }
    };
    const result = await squareRequest<{ catalog_object: SquareCatalogObject }>("/v2/catalog/object", {
      method: "POST",
      body: JSON.stringify({ idempotency_key: crypto.randomUUID(), object })
    });
    const returnedItem = result.catalog_object;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        squareCatalogId: returnedItem.id,
        squareVersion: version(returnedItem.version),
        squareUpdatedAt: asDate(returnedItem.updated_at),
        lastSyncedAt: new Date(),
        syncStatus: SquareSyncStatus.SYNCED,
        syncError: null
      }
    });
    const returnedVariations = returnedItem.item_data?.variations ?? [];
    for (let index = 0; index < returnedVariations.length; index += 1) {
      const returnedVariation = returnedVariations[index];
      const localVariant = product.variants[index];
      if (localVariant) {
        await prisma.productVariant.update({
          where: { id: localVariant.id },
          data: {
            squareCatalogId: returnedVariation.id,
            squareVersion: version(returnedVariation.version),
            lastSyncedAt: new Date(),
            syncStatus: SquareSyncStatus.SYNCED,
            syncError: null
          }
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: "Style",
            value: "Regular",
            priceDeltaCents: 0,
            stock: product.stock,
            squareCatalogId: returnedVariation.id,
            squareVersion: version(returnedVariation.version),
            lastSyncedAt: new Date(),
            syncStatus: SquareSyncStatus.SYNCED
          }
        });
      }
    }
    await writeSquareSyncLog("product.push", SquareSyncStatus.SYNCED, `Pushed ${product.name} to Square.`, { productId });
    return `Pushed ${product.name} to Square.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product sync failed.";
    await prisma.product.update({ where: { id: productId }, data: { syncStatus: SquareSyncStatus.ERROR, syncError: message } }).catch(() => undefined);
    await writeSquareSyncLog("product.push", SquareSyncStatus.ERROR, message, { productId });
    throw error;
  }
}

export async function syncProductInventoryToSquare(productId: string) {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square inventory sync.");
  const locationId = await activeLocationId();
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } });
  if (!product) throw new Error("Product not found.");
  if (product.madeToOrder || product.availability === "MADE_TO_ORDER") {
    const message = `Skipped Square inventory quantity sync for ${product.name}: product is always available / made to order.`;
    await prisma.product.update({
      where: { id: productId },
      data: { inventorySyncStatus: SquareSyncStatus.SKIPPED, inventorySyncError: null, inventorySyncedAt: new Date() }
    });
    await writeSquareSyncLog("inventory.push", SquareSyncStatus.SKIPPED, message, { productId, mode: "always_available" });
    return message;
  }
  if (!product.variants.some((variant) => variant.squareCatalogId)) {
    const message = `Skipped Square inventory sync for ${product.name}: product is not linked to Square variations.`;
    await prisma.product.update({
      where: { id: productId },
      data: { inventorySyncStatus: SquareSyncStatus.SKIPPED, inventorySyncError: message, inventorySyncedAt: new Date() }
    });
    await writeSquareSyncLog("inventory.push", SquareSyncStatus.SKIPPED, message, { productId });
    return message;
  }
  const changes = product.variants
    .filter((variant) => variant.squareCatalogId)
    .map((variant) => ({
      type: "PHYSICAL_COUNT",
      physical_count: {
        catalog_object_id: variant.squareCatalogId,
        location_id: locationId,
        state: "IN_STOCK",
        quantity: String(variant.stock ?? product?.stock ?? 0),
        occurred_at: new Date().toISOString()
      }
    }));
  if (!changes.length) throw new Error("No Square variation IDs are available for inventory sync.");
  await squareRequest("/v2/inventory/changes/batch-create", {
    method: "POST",
    body: JSON.stringify({ idempotency_key: crypto.randomUUID(), changes })
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      lastSyncedAt: new Date(),
      syncStatus: SquareSyncStatus.SYNCED,
      syncError: null,
      inventorySyncedAt: new Date(),
      inventorySyncStatus: SquareSyncStatus.SYNCED,
      inventorySyncError: null
    }
  });
  await writeSquareSyncLog("inventory.push", SquareSyncStatus.SYNCED, `Synced inventory for ${product?.name}.`, { productId, changes: changes.length });
  return `Synced inventory for ${product?.name}.`;
}

export async function archiveProductInSquare(productId: string) {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square archive sync.");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found.");
  if (product.squareCatalogId) {
    await squareRequest("/v2/catalog/batch-delete", {
      method: "POST",
      body: JSON.stringify({ object_ids: [product.squareCatalogId] })
    });
  }
  await prisma.product.update({
    where: { id: productId },
    data: {
      status: "ARCHIVED",
      availability: "OUT_OF_STOCK",
      syncStatus: SquareSyncStatus.SYNCED,
      syncError: null,
      lastSyncedAt: new Date()
    }
  });
  await writeSquareSyncLog("product.archive", SquareSyncStatus.SYNCED, `Archived ${product.name} locally and in Square.`, { productId });
  return `Archived ${product.name} locally and in Square.`;
}

function mapFulfillment(order: SquareOrder) {
  const type = order.fulfillments?.[0]?.type;
  if (type === "SHIPMENT") return "SHIPPING" as const;
  return "PICKUP" as const;
}

function mapRecipient(order: SquareOrder): SquareRecipient {
  return order.fulfillments?.[0]?.shipment_details?.recipient ?? order.fulfillments?.[0]?.pickup_details?.recipient ?? {};
}

export async function importSquareOrders() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is required for Square order import.");
  try {
    const locationId = await activeLocationId();
    const result = await squareRequest<{ orders?: SquareOrder[] }>("/v2/orders/search", {
      method: "POST",
      body: JSON.stringify({
        location_ids: [locationId],
        limit: 25,
        query: { sort: { sort_field: "CREATED_AT", sort_order: "DESC" } }
      })
    });
    const orders = result.orders ?? [];
    for (const squareOrder of orders) {
      const recipient = mapRecipient(squareOrder);
      const totalCents = squareOrder.total_money?.amount ?? squareOrder.net_amount_due_money?.amount ?? 0;
      const existing = await prisma.order.findFirst({ where: { squareOrderId: squareOrder.id } });
      const customerModel = prisma.customer as any;
      const usableCustomerInfo = hasUsableCustomerInfo({
        name: recipient.display_name,
        email: recipient.email_address,
        phone: recipient.phone_number
      });
      const existingCustomer = usableCustomerInfo && (recipient.email_address || recipient.phone_number)
        ? await customerModel.findFirst({
            where: {
              OR: [
                ...(recipient.email_address ? [{ email: recipient.email_address }] : []),
                ...(recipient.phone_number ? [{ phone: recipient.phone_number }] : [])
              ]
            }
          })
        : null;
      const customer = usableCustomerInfo
        ? existingCustomer
          ? await customerModel.update({
              where: { id: existingCustomer.id },
              data: {
                name: recipient.display_name || existingCustomer.name,
                email: recipient.email_address || existingCustomer.email,
                phone: recipient.phone_number || existingCustomer.phone,
                address1: recipient.address?.address_line_1 || existingCustomer.address1,
                city: recipient.address?.locality || existingCustomer.city,
                state: recipient.address?.administrative_district_level_1 || existingCustomer.state,
                postalCode: recipient.address?.postal_code || existingCustomer.postalCode,
                country: "US",
                lastOrderAt: asDate(squareOrder.created_at) ?? new Date(),
                totalSpentCents: existing ? undefined : { increment: totalCents }
              }
            })
          : await customerModel.create({
              data: {
                name: recipient.display_name || recipient.email_address || recipient.phone_number || "Square customer",
                email: recipient.email_address || null,
                phone: recipient.phone_number || null,
                address1: recipient.address?.address_line_1 || null,
                city: recipient.address?.locality || null,
                state: recipient.address?.administrative_district_level_1 || null,
                postalCode: recipient.address?.postal_code || null,
                country: "US",
                lastOrderAt: asDate(squareOrder.created_at) ?? new Date(),
                totalSpentCents: existing ? 0 : totalCents
              }
            })
        : null;
      const data = {
        orderNumber: existing?.orderNumber ?? `SQ-${squareOrder.id.slice(-8).toUpperCase()}`,
        customerId: customer?.id ?? null,
        customerName: recipient.display_name || recipient.email_address || recipient.phone_number || "Square order",
        customerEmail: recipient.email_address || null,
        customerPhone: recipient.phone_number || null,
        fulfillmentType: mapFulfillment(squareOrder),
        paymentStatus: squareOrder.state === "COMPLETED" ? "PAID" as const : "PENDING" as const,
        status: squareOrder.state === "COMPLETED" ? "PAID" as const : "PENDING" as const,
        subtotalCents: totalCents,
        totalCents,
        squareOrderId: squareOrder.id,
        squarePaymentId: squareOrder.tenders?.[0]?.id ?? null,
        squareVersion: version(squareOrder.version),
        squareUpdatedAt: asDate(squareOrder.updated_at),
        lastSyncedAt: new Date(),
        syncStatus: SquareSyncStatus.SYNCED,
        syncError: null,
        address1: recipient.address?.address_line_1 || null,
        city: recipient.address?.locality || null,
        state: recipient.address?.administrative_district_level_1 || null,
        postalCode: recipient.address?.postal_code || null
      };
      const localOrder = existing
        ? await prisma.order.update({ where: { id: existing.id }, data })
        : await prisma.order.create({ data });
      if (!existing) {
        const items = await Promise.all((squareOrder.line_items ?? []).map(async (item) => {
          const variant = item.catalog_object_id
            ? await prisma.productVariant.findFirst({ where: { squareCatalogId: item.catalog_object_id }, select: { productId: true } })
            : null;
          return {
            orderId: localOrder.id,
            productId: variant?.productId ?? null,
            productName: item.name || "Square item",
            quantity: Number(item.quantity ?? 1),
            unitPriceCents: item.base_price_money?.amount ?? item.total_money?.amount ?? 0,
            totalCents: item.total_money?.amount ?? 0,
            customizationNotes: item.note || null
          };
        }));
        await prisma.orderItem.createMany({ data: items });
      }
    }
    const message = `Imported ${orders.length} recent Square orders.`;
    await setSquareSetting("squareLastOrderImport", new Date().toLocaleString());
    await writeSquareSyncLog("orders.import", SquareSyncStatus.SYNCED, message, { count: orders.length });
    return message;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Square order import failed.";
    await writeSquareSyncLog("orders.import", SquareSyncStatus.ERROR, message);
    throw error;
  }
}
