import "server-only";

import { put } from "@vercel/blob";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { slugify } from "@/lib/format";

const maxImageSize = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

export function validateImageFile(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images can be uploaded.");
  }
  if (file.size > maxImageSize) {
    throw new Error("Images must be 5MB or smaller.");
  }
}

export async function uploadImageToBlob(file: File, folder = "products", altText?: string) {
  validateImageFile(file);
  const extension = file.name.split(".").pop()?.toLowerCase() || file.type.split("/")[1] || "jpg";
  const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const blob = await put(`${folder}/${baseName}.${extension}`, file, {
    access: "public",
    addRandomSuffix: true
  });

  if (hasDatabaseUrl()) {
    await prisma.mediaAsset.create({
      data: {
        fileName: file.name,
        url: blob.url,
        altText: altText || file.name.replace(/\.[^.]+$/, ""),
        assetType: "IMAGE",
        mimeType: file.type,
        sizeBytes: file.size
      }
    });
  }

  return blob.url;
}
