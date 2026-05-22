import "server-only";

import bcrypt from "bcryptjs";

export async function verifyAdminCredentials(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) return false;
  if (adminPassword.startsWith("$2a$") || adminPassword.startsWith("$2b$")) {
    return bcrypt.compare(password, adminPassword);
  }
  return password === adminPassword;
}
