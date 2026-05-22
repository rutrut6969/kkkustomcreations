"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { slugify } from "@/lib/format";

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
  await Promise.all(
    keys.map((key) =>
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
