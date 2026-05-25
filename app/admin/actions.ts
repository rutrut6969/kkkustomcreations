"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CustomOrderStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { del } from "@vercel/blob";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { isUploadFile, uploadImageToBlob } from "@/lib/blob-upload";
import {
  ADMIN_ROLES,
  adminInviteUrl,
  bootstrapAdminUser,
  createInviteToken,
  hashPassword,
  hashToken,
  recordTrustedDevice,
  sendInviteEmail,
  writeAuditLog
} from "@/lib/admin-security";
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
  const headerStore = headers();
  const userAgent = headerStore.get("user-agent") ?? "Unknown browser";
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? "";
  const normalizedEmail = email.trim().toLowerCase();
  const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminUser =
    normalizedEmail === envAdminEmail
      ? await bootstrapAdminUser(email, "K&K Super Admin")
      : hasDatabaseUrl()
        ? await (prisma as any).adminUser.update({
            where: { email: normalizedEmail },
            data: { lastLoginAt: new Date() }
          })
        : null;
  if (adminUser) {
    await recordTrustedDevice({ adminUserId: adminUser.id, email, userAgent, ipAddress });
    await writeAuditLog("admin.login", { actorId: adminUser.id, entityType: "AdminUser", entityId: adminUser.id, metadata: { bootstrap: normalizedEmail === envAdminEmail } });
  }
  cookies().set("kk_admin_session", "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  cookies().set("kk_admin_email", normalizedEmail, {
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
  cookies().delete("kk_admin_email");
  redirect("/admin/login");
}

export async function inviteAdminUser(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const schema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
    role: z.enum(ADMIN_ROLES)
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter a valid email and role." };

  const email = parsed.data.email.trim().toLowerCase();
  const token = createInviteToken();
  const url = adminInviteUrl(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const actorEmail = cookies().get("kk_admin_email")?.value;
  const actor = actorEmail ? await (prisma as any).adminUser.findUnique({ where: { email: actorEmail } }) : null;

  await (prisma as any).adminUser.upsert({
    where: { email },
    create: {
      email,
      name: parsed.data.name?.trim() || email.split("@")[0],
      role: parsed.data.role,
      status: "INVITED"
    },
    update: {
      name: parsed.data.name?.trim() || undefined,
      role: parsed.data.role,
      status: "INVITED"
    }
  });

  await (prisma as any).adminInvite.create({
    data: {
      email,
      role: parsed.data.role,
      tokenHash: hashToken(token),
      invitedById: actor?.id ?? null,
      expiresAt
    }
  });

  const emailResult = await sendInviteEmail(email, url, parsed.data.role);
  await writeAuditLog("admin.invite.created", { actorId: actor?.id, entityType: "AdminInvite", metadata: { email, role: parsed.data.role, emailSent: emailResult.sent } });
  revalidatePath("/admin/security");
  return { ok: true, message: emailResult.message };
}

export async function acceptAdminInvite(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!token || !name || password.length < 10) return { ok: false, message: "Add your name and a password at least 10 characters long." };

  const invite = await (prisma as any).adminInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return { ok: false, message: "This invite is invalid or expired." };

  const passwordHash = await hashPassword(password);
  const adminUser = await (prisma as any).adminUser.upsert({
    where: { email: invite.email },
    create: {
      email: invite.email,
      name,
      role: invite.role,
      status: "ACTIVE",
      passwordHash,
      lastLoginAt: new Date()
    },
    update: {
      name,
      role: invite.role,
      status: "ACTIVE",
      passwordHash,
      lastLoginAt: new Date()
    }
  });
  await (prisma as any).adminInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await writeAuditLog("admin.invite.accepted", { actorId: adminUser.id, entityType: "AdminUser", entityId: adminUser.id });
  cookies().set("kk_admin_session", "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  cookies().set("kk_admin_email", invite.email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  redirect("/admin");
}

export async function updateAdminUserStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!hasDatabaseUrl() || !id || !["ACTIVE", "INVITED", "SUSPENDED", "DEACTIVATED"].includes(status)) return;
  await (prisma as any).adminUser.update({ where: { id }, data: { status } });
  await writeAuditLog("admin.user.status.updated", { entityType: "AdminUser", entityId: id, metadata: { status } });
  revalidatePath("/admin/security");
}

export async function revokeTrustedDevice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!hasDatabaseUrl() || !id) return;
  await (prisma as any).trustedDevice.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } });
  await writeAuditLog("admin.device.revoked", { entityType: "TrustedDevice", entityId: id });
  revalidatePath("/admin/security");
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
    "shippingEnabled",
    "flatShippingRate",
    "freeShippingThreshold",
    "localPickupEnabled",
    "localDropoffEnabled",
    "localDropoffFee",
    "shippingCheckoutMessage",
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
        create: {
          key,
          value: ["customOrdersEnabled", "shippingEnabled", "localPickupEnabled", "localDropoffEnabled"].includes(key)
            ? String(formData.has(key))
            : String(formData.get(key) ?? "")
        },
        update: {
          value: ["customOrdersEnabled", "shippingEnabled", "localPickupEnabled", "localDropoffEnabled"].includes(key)
            ? String(formData.has(key))
            : String(formData.get(key) ?? "")
        }
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

function isMissingRecord(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
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
    metaDescription: z.string().optional(),
    description: z.string().min(1),
    imageUrl: z.string().optional(),
    tags: z.string().optional(),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
    availability: z.enum(["IN_STOCK", "LOW_STOCK", "MADE_TO_ORDER", "OUT_OF_STOCK"]),
    featured: z.string().optional(),
    trackQuantity: z.string().optional(),
    madeToOrder: z.string().optional(),
    variantName: z.string().optional(),
    variantValue: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please complete the required product fields." };
  const salePriceCents = parseCents(parsed.data.salePrice ?? null);
  const primaryImageFile = formData.get("primaryImageFile");
  let imageUrl = parsed.data.imageUrl || "";
  if (isUploadFile(primaryImageFile)) {
    try {
      imageUrl = await uploadImageToBlob(primaryImageFile, "products", parsed.data.name);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Image upload failed." };
    }
  }
  if (!imageUrl) return { ok: false, message: "Add a product image upload or image URL." };
  const tracksQuantity = parsed.data.trackQuantity === "on" && parsed.data.madeToOrder !== "on";
  const madeToOrder = parsed.data.madeToOrder === "on" || !tracksQuantity;
  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name),
    categoryId: parsed.data.categoryId,
    priceCents: parseCents(parsed.data.price) ?? 0,
    salePriceCents,
    stock: Number(parsed.data.stock || 0),
    shortDescription: parsed.data.shortDescription || null,
    metaDescription: parsed.data.metaDescription || parsed.data.shortDescription || null,
    description: parsed.data.description,
    imageUrl,
    tags: parseTags(parsed.data.tags ?? null),
    status: parsed.data.status,
    availability: madeToOrder ? "MADE_TO_ORDER" as const : parsed.data.availability,
    featured: parsed.data.featured === "on",
    madeToOrder
  };
  const product = parsed.data.id
    ? await prisma.product.update({ where: { id: parsed.data.id }, data })
    : await prisma.product.create({ data });

  await prisma.productImage.upsert({
    where: { id: `${product.id}-primary` },
    create: { id: `${product.id}-primary`, productId: product.id, url: data.imageUrl, alt: data.name, sortOrder: 0 },
    update: { url: data.imageUrl, alt: data.name }
  });

  const galleryFiles = formData.getAll("galleryImages").filter(isUploadFile);
  for (let index = 0; index < galleryFiles.length; index += 1) {
    try {
      const url = await uploadImageToBlob(galleryFiles[index], "products/gallery", parsed.data.name);
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url,
          alt: `${parsed.data.name} gallery image`,
          sortOrder: index + 1
        }
      });
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Gallery image upload failed." };
    }
  }

  if (parsed.data.variantName && parsed.data.variantValue) {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: parsed.data.variantName,
        value: parsed.data.variantValue
      }
    });
  }

  let syncMessage = "";
  try {
    await pushProductToSquare(product.id);
    await syncProductInventoryToSquare(product.id);
    syncMessage = " Synced to Square.";
  } catch (error) {
    syncMessage = ` Saved locally, but Square sync needs attention: ${error instanceof Error ? error.message : "Square sync failed."}`;
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  return { ok: true, message: `Product saved.${syncMessage}` };
}

export async function archiveProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED", availability: "OUT_OF_STOCK", archivedAt: new Date() } });
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

export async function restoreProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) {
    await prisma.product.update({ where: { id }, data: { status: "ACTIVE", archivedAt: null, deletedAt: null } });
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

export async function permanentlyDeleteProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const confirmDelete = formData.get("confirmDelete") === "on";
  if (!hasDatabaseUrl() || !id) return;
  const paidOrderCount = await prisma.orderItem.count({
    where: { productId: id, order: { paymentStatus: "PAID" } }
  });
  if (paidOrderCount > 0 && !confirmDelete) {
    await prisma.product.update({
      where: { id },
      data: { status: "ARCHIVED", availability: "OUT_OF_STOCK", archivedAt: new Date(), deletedAt: new Date() }
    });
  } else {
    await prisma.product.delete({ where: { id } });
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

export async function setPrimaryProductImage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) {
    const image = await prisma.productImage.findUnique({ where: { id }, include: { product: true } });
    if (image) {
      await prisma.product.update({ where: { id: image.productId }, data: { imageUrl: image.url } });
      await prisma.productImage.update({ where: { id }, data: { sortOrder: 0 } });
    }
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

export async function deleteProductImage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) {
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (image) {
      await prisma.productImage.delete({ where: { id } });
      if (image.url.includes("blob.vercel-storage.com")) await del(image.url).catch(() => undefined);
    }
  }
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

export async function archiveOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.order.update({ where: { id }, data: { archivedAt: new Date() } });
  revalidatePath("/admin/orders");
}

export async function restoreOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) await prisma.order.update({ where: { id }, data: { archivedAt: null, deletedAt: null } });
  revalidatePath("/admin/orders");
}

export async function permanentlyDeleteOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const confirmDelete = formData.get("confirmDelete") === "on";
  if (!hasDatabaseUrl() || !id) return;
  const order = await prisma.order.findUnique({ where: { id }, select: { paymentStatus: true } });
  if (order?.paymentStatus === "PAID" && !confirmDelete) {
    await prisma.order.update({ where: { id }, data: { archivedAt: new Date(), deletedAt: new Date() } });
  } else {
    await prisma.order.delete({ where: { id } });
  }
  revalidatePath("/admin/orders");
}

export async function saveCustomerAdmin(_state: AdminState, formData: FormData): Promise<AdminState> {
  const noDb = requireDb();
  if (noDb) return noDb;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Customer id is required." };
  await (prisma.customer as any).update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      address1: String(formData.get("address1") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      state: String(formData.get("state") ?? "") || null,
      postalCode: String(formData.get("postalCode") ?? "") || null,
      country: String(formData.get("country") ?? "US") || "US",
      marketingConsent: formData.get("marketingConsent") === "on",
      orderConsent: formData.get("orderConsent") === "on",
      notes: String(formData.get("notes") ?? "") || null,
      tags: parseTags(formData.get("tags"))
    }
  });
  revalidatePath("/admin/customers");
  return { ok: true, message: "Customer updated successfully." };
}

export async function archiveCustomer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) {
    await (prisma.customer as any).update({ where: { id }, data: { archivedAt: new Date() } }).catch((error: unknown) => {
      if (!isMissingRecord(error)) throw error;
    });
  }
  revalidatePath("/admin/customers");
}

export async function restoreCustomer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (hasDatabaseUrl() && id) {
    await (prisma.customer as any).update({ where: { id }, data: { archivedAt: null, deletedAt: null } }).catch((error: unknown) => {
      if (!isMissingRecord(error)) throw error;
    });
  }
  revalidatePath("/admin/customers");
}

export async function permanentlyDeleteCustomer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const confirmDelete = formData.get("confirmDelete") === "on";
  if (!hasDatabaseUrl() || !id) return;
  const customer = await (prisma.customer as any).findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (!customer) {
    revalidatePath("/admin/customers");
    return;
  }
  const paidOrderCount = await prisma.order.count({ where: { customerId: id, paymentStatus: "PAID" } });
  if (paidOrderCount > 0 || customer._count.orders > 0 || !confirmDelete) {
    await (prisma.customer as any).update({ where: { id }, data: { archivedAt: new Date(), deletedAt: new Date() } });
  } else {
    await prisma.customer.delete({ where: { id } }).catch((error: unknown) => {
      if (!isMissingRecord(error)) throw error;
    });
  }
  revalidatePath("/admin/customers");
}

export async function archiveEmptyCustomers() {
  if (!hasDatabaseUrl()) return;
  await (prisma.customer as any).updateMany({
    where: {
      deletedAt: null,
      OR: [
        { AND: [{ email: null }, { phone: null }] },
        { AND: [{ email: "" }, { phone: "" }] },
        { name: { in: ["Square customer", "Square order", "Unknown", "Customer"] } }
      ]
    },
    data: { archivedAt: new Date(), deletedAt: new Date() }
  });
  revalidatePath("/admin/customers");
}

export async function mergeDuplicateCustomers() {
  if (!hasDatabaseUrl()) return;
  const customers = await (prisma.customer as any).findMany({
    where: { deletedAt: null },
    orderBy: [{ lastOrderAt: "desc" }, { updatedAt: "desc" }]
  });
  const groups = new Map<string, any[]>();
  for (const customer of customers) {
    const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
    const phone = typeof customer.phone === "string" ? customer.phone.replace(/\D/g, "") : "";
    const key = email ? `email:${email}` : phone ? `phone:${phone}` : "";
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), customer]);
  }
  for (const duplicates of Array.from(groups.values())) {
    if (duplicates.length < 2) continue;
    const [primary, ...rest] = duplicates;
    for (const duplicate of rest) {
      await prisma.order.updateMany({ where: { customerId: duplicate.id }, data: { customerId: primary.id } });
      await (prisma.customer as any).update({
        where: { id: duplicate.id },
        data: { archivedAt: new Date(), deletedAt: new Date() }
      });
    }
  }
  revalidatePath("/admin/customers");
}

export async function deleteArchivedEmptyCustomers() {
  if (!hasDatabaseUrl()) return;
  const customers = await (prisma.customer as any).findMany({
    where: {
      deletedAt: { not: null },
      orders: { none: {} },
      AND: [
        { OR: [{ email: null }, { email: "" }] },
        { OR: [{ phone: null }, { phone: "" }] }
      ]
    },
    select: { id: true }
  });
  for (const customer of customers) {
    await prisma.customer.delete({ where: { id: customer.id } }).catch((error: unknown) => {
      if (!isMissingRecord(error)) throw error;
    });
  }
  revalidatePath("/admin/customers");
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
  const uploadFile = formData.get("mediaFile");
  let uploadedUrl = "";
  if (isUploadFile(uploadFile)) {
    try {
      uploadedUrl = await uploadImageToBlob(uploadFile, "media", String(formData.get("altText") ?? ""));
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Media upload failed." };
    }
  }
  const schema = z.object({
    id: z.string().optional(),
    fileName: z.string().min(1),
    url: z.string().optional(),
    altText: z.string().optional(),
    assetType: z.enum(["IMAGE", "DOCUMENT", "OTHER"]),
    mimeType: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Media name is required." };
  const url = uploadedUrl || parsed.data.url || "";
  if (!url) return { ok: false, message: "Upload a file or add a media URL." };
  const data = {
    fileName: parsed.data.fileName,
    url,
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
  if (hasDatabaseUrl() && id) {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (asset) {
      await prisma.mediaAsset.delete({ where: { id } });
      if (asset.url.includes("blob.vercel-storage.com")) await del(asset.url).catch(() => undefined);
    }
  }
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
