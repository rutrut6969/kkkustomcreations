import "server-only";

import bcrypt from "bcryptjs";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export async function verifyAdminCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (hasDatabaseUrl()) {
    const user = await (prisma as any).adminUser.findUnique({ where: { email: normalizedEmail } });
    if (user?.status === "ACTIVE" && user.passwordHash) {
      return bcrypt.compare(password, user.passwordHash);
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  if (normalizedEmail !== adminEmail.trim().toLowerCase()) return false;
  if (adminPassword.startsWith("$2a$") || adminPassword.startsWith("$2b$")) {
    return bcrypt.compare(password, adminPassword);
  }
  return password === adminPassword;
}
