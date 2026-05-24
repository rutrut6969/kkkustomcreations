import "server-only";

import { AvailabilityStatus, SquareSyncStatus } from "@prisma/client";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { setSquareSetting, syncProductInventoryToSquare, writeSquareSyncLog } from "@/lib/square-sync";

const lowStockThreshold = 3;

function availabilityFor(stock: number) {
  if (stock <= 0) return AvailabilityStatus.OUT_OF_STOCK;
  if (stock <= lowStockThreshold) return AvailabilityStatus.LOW_STOCK;
  return AvailabilityStatus.IN_STOCK;
}

export async function adjustInventoryForPaidOrder(orderId: string, idempotencyKey?: string) {
  if (!hasDatabaseUrl()) return { status: "skipped", message: "DATABASE_URL is not configured." };

  const claim = await prisma.order.updateMany({
    where: { id: orderId, inventoryAdjustedAt: null },
    data: {
      idempotencyKey: idempotencyKey || undefined,
      inventoryAdjustmentStatus: SquareSyncStatus.PENDING,
      inventoryAdjustmentError: null
    }
  });
  if (claim.count === 0) {
    await writeSquareSyncLog("inventory.adjust", SquareSyncStatus.SKIPPED, "Inventory adjustment skipped because this order was already adjusted.", { orderId, idempotencyKey });
    return { status: "skipped", message: "Inventory already adjusted." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  if (!order) throw new Error("Order not found.");

  const productIds = Array.from(new Set(order.items.map((item) => item.productId).filter(Boolean))) as string[];
  const syncErrors: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true, madeToOrder: true, availability: true } });
      if (!product) continue;
      if (product.madeToOrder || product.availability === AvailabilityStatus.MADE_TO_ORDER) continue;
      const nextStock = Math.max(0, product.stock - item.quantity);
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: nextStock,
          availability: availabilityFor(nextStock)
        }
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        inventoryAdjustedAt: new Date(),
        inventoryAdjustmentStatus: SquareSyncStatus.PENDING,
        inventoryAdjustmentError: null
      }
    });
  });

  for (const productId of productIds) {
    try {
      await syncProductInventoryToSquare(productId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Square inventory sync failed.";
      syncErrors.push(message);
      await prisma.product.update({
        where: { id: productId },
        data: { inventorySyncStatus: SquareSyncStatus.ERROR, inventorySyncError: message, inventorySyncedAt: new Date() }
      }).catch(() => undefined);
      await writeSquareSyncLog("inventory.push", SquareSyncStatus.ERROR, message, { orderId, productId });
    }
  }

  const status = syncErrors.length ? SquareSyncStatus.ERROR : SquareSyncStatus.SYNCED;
  const message = syncErrors.length ? syncErrors.join(" ") : `Adjusted inventory for order ${order.orderNumber}.`;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      inventoryAdjustmentStatus: status,
      inventoryAdjustmentError: syncErrors.length ? message : null
    }
  });
  await setSquareSetting("squareLastInventoryAdjustment", new Date().toLocaleString());
  await writeSquareSyncLog("inventory.adjust", status, message, { orderId, productIds });
  return { status: status.toLowerCase(), message };
}
