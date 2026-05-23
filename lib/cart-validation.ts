import "server-only";

import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export async function validateCheckoutInventory(items: { productId: string; quantity: number }[]) {
  if (!hasDatabaseUrl()) return null;
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((item) => item.productId) } },
    select: { id: true, name: true, stock: true, availability: true, madeToOrder: true, status: true }
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || product.status !== "ACTIVE") return "One of the items in your cart is no longer available.";
    if (product.availability === "OUT_OF_STOCK") return `${product.name} is out of stock.`;
    if (!product.madeToOrder && item.quantity > product.stock) return `${product.name} only has ${product.stock} available.`;
  }
  return null;
}
