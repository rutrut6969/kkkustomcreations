import { slugify } from "@/lib/format";

export type QuickAddDraft = {
  productTitle: string;
  shortDescription: string;
  description: string;
  tags: string[];
  metaDescription: string;
  imageAltText: string;
  suggestedCategory: string;
  suggestedAvailability: "IN_STOCK" | "LOW_STOCK" | "MADE_TO_ORDER" | "OUT_OF_STOCK";
  price: string;
  quantity: number;
};

export function parseQuickAddFilename(fileName: string): Partial<QuickAddDraft> {
  const base = fileName.replace(/\.[^.]+$/, "");
  const parts = base.split("_").map((part) => part.trim()).filter(Boolean);
  const name = parts[0] ?? base;
  const category = parts[1] ?? "Custom Orders";
  const pricePart = parts.find((part) => /^pr/i.test(part));
  const quantityPart = parts.find((part) => /^q/i.test(part));
  const price = pricePart ? pricePart.replace(/^pr/i, "").replace("-", ".") : "";
  const quantity = quantityPart ? Number(quantityPart.replace(/^q/i, "")) : 0;
  const title = name.split(/[-\s]+/).filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
  return {
    productTitle: title,
    suggestedCategory: category.split(/[-\s]+/).filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" "),
    price,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    suggestedAvailability: quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    tags: [slugify(category), "quick-add"].filter(Boolean)
  };
}
