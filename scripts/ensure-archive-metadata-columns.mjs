import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT',
  'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3)',
  'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)',
  'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3)',
  'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)',
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("Archive/upload metadata columns ensured.");
} finally {
  await prisma.$disconnect();
}
