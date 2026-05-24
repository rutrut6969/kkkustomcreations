import { NextResponse } from "next/server";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { isUploadFile, uploadImageToBlob } from "@/lib/blob-upload";
import { pushProductToSquare, syncProductInventoryToSquare } from "@/lib/square-sync";

export const runtime = "nodejs";

function authed(request: Request) {
  return request.headers.get("cookie")?.includes("kk_admin_session=authenticated");
}

function cents(value: FormDataEntryValue | null) {
  return Math.round(Number(String(value ?? "0").replace(/[^0-9.]/g, "")) * 100);
}

export async function POST(request: Request) {
  if (!authed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "DATABASE_URL is required." }, { status: 500 });
  const formData = await request.formData();
  const image = formData.get("image");
  if (!isUploadFile(image)) return NextResponse.json({ error: "Product image is required." }, { status: 400 });

  const name = String(formData.get("name") ?? "").trim();
  const categoryName = String(formData.get("category") ?? "Custom Orders").trim();
  if (!name) return NextResponse.json({ error: "Product title is required." }, { status: 400 });

  try {
    const imageUrl = await uploadImageToBlob(image, "products/quick-add", String(formData.get("altText") ?? name));
    const category = await prisma.category.upsert({
      where: { slug: slugify(categoryName) },
      create: { name: categoryName, slug: slugify(categoryName), visible: true },
      update: { name: categoryName, visible: true }
    });
    const product = await prisma.product.create({
      data: {
        name,
        slug: slugify(name),
        categoryId: category.id,
        priceCents: cents(formData.get("price")),
        stock: Number(formData.get("quantity") ?? 0),
        availability: String(formData.get("availability") ?? "IN_STOCK") as any,
        status: "ACTIVE",
        featured: formData.get("featured") === "on",
        madeToOrder: formData.get("madeToOrder") === "on",
        imageUrl,
        shortDescription: String(formData.get("shortDescription") ?? ""),
        description: String(formData.get("description") ?? ""),
        metaDescription: String(formData.get("metaDescription") ?? ""),
        tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
        images: { create: { url: imageUrl, alt: String(formData.get("altText") ?? name), sortOrder: 0 } }
      }
    });
    let syncWarning: string | null = null;
    try {
      await pushProductToSquare(product.id);
      await syncProductInventoryToSquare(product.id);
    } catch (error) {
      syncWarning = error instanceof Error ? error.message : "Square sync failed.";
    }
    return NextResponse.json({ ok: true, productId: product.id, syncWarning, url: `/admin/products?filter=active` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Quick add publish failed." }, { status: 500 });
  }
}
