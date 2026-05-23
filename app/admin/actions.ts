"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CustomOrderStatus, OrderStatus, PaymentStatus } from "@prisma/client";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import {
  archiveProductInSquare,
  importSquareOrders,
  archiveCategoryInSquare,
  pullSquareCategoriesIntoWebsite,
  pullSquareCatalogIntoWebsite,
  pushAllCategoriesToSquare,
  pushCategoryToSquare,
  pushProductToSquare,
  syncCategoryRelationships,
  syncProductInventoryToSquare
} from "@/lib/square-sync";

export type AdminState = { ok?: boolean; message?: string };

function requireDb() {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured. Admin changes are disabled in demo mode." };
  }
  return null;
}

export async function loginAdmin(_state: AdminState, formData: FormData): Promise<AdminState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const ok = await verifyAdminCredentials(email, password);
  if (!ok) return { ok: false, message: "Invalid admin email or password." };
  cookies().set("kk_admin_session", "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAdmin() {
  cookies().delete("kk_admin_session");
  redirect("/admin/login");
}

export async function saveSettings(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const keys = [
    "businessName",
    "homepageBannerText",
    "businessInfo",
    "contactEmail",
    "contactPhone",
    "facebookUrl",
    "facebookEmbedUrl",
    "shippingText",
    "pickupText",
    "dropoffText",
    "customOrdersEnabled"
  ];
  const submittedKeys = String(formData.get("settingsKeys") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const keysToSave = submittedKeys.length ? submittedKeys : keys;
  await Promise.all(
    keysToSave.map((key) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: key === "customOrdersEnabled" ? String(formData.has(key)) : String(formData.get(key) ?? "") },
        update: { value: key === "customOrdersEnabled" ? String(formData.has(key)) : String(formData.get(key) ?? "") }
      })
    )
  );
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Settings saved." };
}

function parseCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return Math.round(Number(raw) * 100);
}

function parseTags(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function saveProduct(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    slug: z.string().optional(),
    categoryId: z.string().min(1),
    price: z.string().min(1),
    salePrice: z.string().optional(),
    stock: z.string().optional(),
    shortDescription: z.string().optional(),
    description: z.string().min(1),
    imageUrl: z.string().min(1),
    tags: z.string().optional(),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
    availability: z.enum(["IN_STOCK", "LOW_STOCK", "MADE_TO_ORDER", "OUT_OF_STOCK"]),
    featured: z.string().optional(),
    madeToOrder: z.string().optional(),
    variantName: z.string().optional(),
    variantValue: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please complete the required product fields." };
  const salePriceCents = parseCents(parsed.data.salePrice ?? null);
  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name),
    categoryId: parsed.data.categoryId,
    priceCents: parseCents(parsed.data.price) ?? 0,
    salePriceCents,
    stock: Number(parsed.data.stock || 0),
    shortDescription: parsed.data.shortDescription || null,
    description: parsed.data.description,
    imageUrl: parsed.data.imageUrl,
    tags: parseTags(parsed.data.tags ?? null),
    status: parsed.data.status,
    availability: parsed.data.availability,
    featured: parsed.data.featured === "on",
    madeToOrder: parsed.data.madeToOrder === "on"
  };
  const product = parsed.data.id
    ? await prisma.product.update({ where: { id: parsed.data.id }, data })
    : await prisma.product.create({ data });

  await prisma.productImage.upsert({
    where: { id: `${product.id}-primary` },
    create: { id: `${product.id}-primary`, productId: product.id, url: data.imageUrl, alt: data.name },
    update: { url: data.imageUrl, alt: data.name }
  });

  if (parsed.data.variantName && parsed.data.variantValue) {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: parsed.data.variantName,
        value: parsed.data.variantValue
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  return { ok: true, message: "Product saved." };
}

export async function archiveProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED", availability: "OUT_OF_STOCK" } });
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

export async function deleteProductImage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.productImage.delete({ where: { id } });
  revalidatePath("/admin/products");
}

export async function saveCategory(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    bannerImageUrl: z.string().optional(),
    sortOrder: z.string().optional(),
    visible: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Category name is required." };
  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name),
    description: parsed.data.description || null,
    bannerImageUrl: parsed.data.bannerImageUrl || null,
    sortOrder: Number(parsed.data.sortOrder || 0),
    visible: parsed.data.visible === "on"
  };
  if (parsed.data.id) await prisma.category.update({ where: { id: parsed.data.id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/shop");
  revalidatePath("/admin/categories");
  return { ok: true, message: "Category saved." };
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.category.delete({ where: { id } });
  revalidatePath("/shop");
  revalidatePath("/admin/categories");
}

export async function pushCategoryToSquareAction(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Category id is required." };
  try {
    const category = await pushCategoryToSquare(id);
    await syncCategoryRelationships(id);
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/integrations");
    return { ok: true, message: `Synced ${category.category_data?.name ?? "category"} to Square.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square category sync failed." };
  }
}

export async function archiveCategoryInSquareAction(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Category id is required." };
  try {
    const message = await archiveCategoryInSquare(id);
    revalidatePath("/shop");
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/integrations");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square category archive failed." };
  }
}

export async function saveOrder(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Order id is required." };
  await prisma.order.update({
    where: { id },
    data: {
      paymentStatus: String(formData.get("paymentStatus")) as PaymentStatus,
      status: String(formData.get("status")) as OrderStatus,
      internalNotes: String(formData.get("internalNotes") ?? "")
    }
  });
  revalidatePath("/admin/orders");
  return { ok: true, message: "Order updated." };
}

export async function saveCustomOrderAdmin(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Request id is required." };
  await prisma.customOrderRequest.update({
    where: { id },
    data: {
      status: String(formData.get("status")) as CustomOrderStatus,
      internalNotes: String(formData.get("internalNotes") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? "") || null,
      archived: formData.get("archived") === "on"
    }
  });
  revalidatePath("/admin/custom-orders");
  return { ok: true, message: "Custom request updated." };
}

export async function saveMediaAsset(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const schema = z.object({
    id: z.string().optional(),
    fileName: z.string().min(1),
    url: z.string().min(1),
    altText: z.string().optional(),
    assetType: z.enum(["IMAGE", "DOCUMENT", "OTHER"]),
    mimeType: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Media name and URL are required." };
  const data = {
    fileName: parsed.data.fileName,
    url: parsed.data.url,
    altText: parsed.data.altText || null,
    assetType: parsed.data.assetType,
    mimeType: parsed.data.mimeType || null
  };
  if (parsed.data.id) await prisma.mediaAsset.update({ where: { id: parsed.data.id }, data });
  else await prisma.mediaAsset.create({ data });
  revalidatePath("/admin/media");
  return { ok: true, message: "Media asset saved." };
}

export async function deleteMediaAsset(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.mediaAsset.delete({ where: { id } });
  revalidatePath("/admin/media");
}

export async function saveAnnouncement(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const schema = z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    body: z.string().min(1),
    active: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Announcement title and body are required." };
  const data = { title: parsed.data.title, body: parsed.data.body, active: parsed.data.active === "on" };
  if (parsed.data.id) {
    await prisma.announcement.update({ where: { id: parsed.data.id }, data });
  } else {
    await prisma.announcement.create({ data });
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Announcement saved." };
}

export async function deleteAnnouncement(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.announcement.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function saveEvent(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const schema = z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    date: z.string().min(1),
    time: z.string().min(1),
    location: z.string().min(1),
    description: z.string().min(1),
    facebookEventLink: z.string().optional(),
    featured: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please complete all event fields." };
  const data = {
    title: parsed.data.title,
    date: new Date(parsed.data.date),
    time: parsed.data.time,
    location: parsed.data.location,
    description: parsed.data.description,
    facebookEventLink: parsed.data.facebookEventLink || null,
    featured: parsed.data.featured === "on"
  };
  if (parsed.data.id) await prisma.event.update({ where: { id: parsed.data.id }, data });
  else await prisma.event.create({ data });
  revalidatePath("/events");
  revalidatePath("/admin");
  return { ok: true, message: "Event saved." };
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.event.delete({ where: { id } });
  revalidatePath("/events");
  revalidatePath("/admin");
}

export async function savePost(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const schema = z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    slug: z.string().optional(),
    excerpt: z.string().min(1),
    body: z.string().min(1),
    publishedDate: z.string().min(1),
    featuredImage: z.string().optional(),
    status: z.enum(["PUBLISHED", "DRAFT"])
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please complete all post fields." };
  const data = {
    title: parsed.data.title,
    slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.title),
    excerpt: parsed.data.excerpt,
    body: parsed.data.body,
    publishedDate: new Date(parsed.data.publishedDate),
    featuredImage: parsed.data.featuredImage || null,
    status: parsed.data.status
  };
  if (parsed.data.id) await prisma.blogPost.update({ where: { id: parsed.data.id }, data });
  else await prisma.blogPost.create({ data });
  revalidatePath("/blog");
  revalidatePath("/admin");
  return { ok: true, message: "Post saved." };
}

export async function deletePost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.blogPost.delete({ where: { id } });
  revalidatePath("/blog");
  revalidatePath("/admin");
}

export async function saveFeaturedProducts(formData: FormData) {
  if (!hasDatabaseUrl()) return;
  const ids = new Set(formData.getAll("featured").map(String));
  const products = await prisma.product.findMany({ select: { id: true } });
  await Promise.all(products.map((product) => prisma.product.update({ where: { id: product.id }, data: { featured: ids.has(product.id) } })));
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
}

export async function pullSquareCatalogAction(_state: AdminState, _formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  try {
    const message = await pullSquareCatalogIntoWebsite();
    revalidatePath("/shop");
    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/admin/integrations");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square catalog pull failed." };
  }
}

export async function pullSquareCategoriesAction(_state: AdminState, _formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  try {
    const message = await pullSquareCategoriesIntoWebsite();
    revalidatePath("/shop");
    revalidatePath("/admin/categories");
    revalidatePath("/admin/integrations");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square category pull failed." };
  }
}

export async function pushAllCategoriesAction(_state: AdminState, _formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  try {
    const message = await pushAllCategoriesToSquare();
    await syncCategoryRelationships();
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/integrations");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square category push failed." };
  }
}

export async function importSquareOrdersAction(_state: AdminState, _formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  try {
    const message = await importSquareOrders();
    revalidatePath("/admin/orders");
    revalidatePath("/admin/integrations");
    revalidatePath("/admin");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square order import failed." };
  }
}

export async function pushProductToSquareAction(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Product id is required." };
  try {
    const message = await pushProductToSquare(id);
    revalidatePath("/admin/products");
    revalidatePath("/admin/integrations");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square product sync failed." };
  }
}

export async function syncProductInventoryAction(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Product id is required." };
  try {
    const message = await syncProductInventoryToSquare(id);
    revalidatePath("/admin/products");
    revalidatePath("/admin/integrations");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square inventory sync failed." };
  }
}

export async function archiveProductInSquareAction(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Product id is required." };
  try {
    const message = await archiveProductInSquare(id);
    revalidatePath("/shop");
    revalidatePath("/admin/products");
    revalidatePath("/admin/integrations");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Square product archive failed." };
  }
}
