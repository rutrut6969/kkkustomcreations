-- AlterEnum
ALTER TYPE "SquareSyncStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "inventorySyncedAt" TIMESTAMP(3),
ADD COLUMN "inventorySyncStatus" "SquareSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "inventorySyncError" TEXT;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "inventoryAdjustedAt" TIMESTAMP(3),
ADD COLUMN "inventoryAdjustmentStatus" "SquareSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "inventoryAdjustmentError" TEXT,
ADD COLUMN "webhookProcessedAt" TIMESTAMP(3),
ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
