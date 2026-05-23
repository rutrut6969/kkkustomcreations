-- CreateEnum
CREATE TYPE "SquareSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCED', 'PENDING', 'ERROR');

-- AlterTable
ALTER TABLE "Category"
ADD COLUMN "squareCatalogId" TEXT,
ADD COLUMN "squareVersion" TEXT,
ADD COLUMN "squareUpdatedAt" TIMESTAMP(3),
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "syncStatus" "SquareSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "syncError" TEXT;

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "squareVersion" TEXT,
ADD COLUMN "squareUpdatedAt" TIMESTAMP(3),
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "syncStatus" "SquareSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "syncError" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant"
ADD COLUMN "squareCatalogId" TEXT,
ADD COLUMN "squareVersion" TEXT,
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "syncStatus" "SquareSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "syncError" TEXT;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "squareVersion" TEXT,
ADD COLUMN "squareUpdatedAt" TIMESTAMP(3),
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "syncStatus" "SquareSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "syncError" TEXT;

-- CreateTable
CREATE TABLE "SquareSyncLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" "SquareSyncStatus" NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SquareSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_squareCatalogId_key" ON "Category"("squareCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_squareCatalogId_key" ON "Product"("squareCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_squareCatalogId_key" ON "ProductVariant"("squareCatalogId");
