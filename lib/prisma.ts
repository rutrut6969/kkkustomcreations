import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function databaseUrl() {
  return process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL;
}

if (!process.env.DATABASE_URL) {
  const url = databaseUrl();
  if (url) {
    process.env.DATABASE_URL = url;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function hasDatabaseUrl() {
  return Boolean(databaseUrl());
}
