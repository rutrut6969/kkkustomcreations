import "server-only";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "DEVELOPER", "MANAGER", "EMPLOYEE"] as const;
export type AdminRoleName = (typeof ADMIN_ROLES)[number];

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function adminInviteUrl(token: string) {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(`/admin/invite/${token}`, base).toString();
  } catch {
    return `http://localhost:3000/admin/invite/${token}`;
  }
}

export async function bootstrapAdminUser(email: string, name = "Bootstrap Admin") {
  if (!hasDatabaseUrl()) return null;
  const normalizedEmail = email.trim().toLowerCase();
  return (prisma as any).adminUser.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      name,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      lastLoginAt: new Date()
    },
    update: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      lastLoginAt: new Date()
    }
  });
}

export function deviceHash(email: string, userAgent: string, ipAddress: string) {
  return crypto
    .createHash("sha256")
    .update(`${email.trim().toLowerCase()}|${userAgent}|${ipAddress}`)
    .digest("hex");
}

export async function recordTrustedDevice({
  adminUserId,
  email,
  userAgent,
  ipAddress
}: {
  adminUserId?: string;
  email: string;
  userAgent: string;
  ipAddress: string;
}) {
  if (!hasDatabaseUrl()) return null;
  const hash = deviceHash(email, userAgent, ipAddress);
  return (prisma as any).trustedDevice.upsert({
    where: { deviceHash: hash },
    create: {
      adminUserId,
      deviceHash: hash,
      status: "APPROVED",
      browser: userAgent.slice(0, 240) || "Unknown browser",
      ipAddress: ipAddress || null,
      approvedAt: new Date(),
      lastSeenAt: new Date()
    },
    update: {
      adminUserId,
      status: "APPROVED",
      browser: userAgent.slice(0, 240) || "Unknown browser",
      ipAddress: ipAddress || null,
      revokedAt: null,
      approvedAt: new Date(),
      lastSeenAt: new Date()
    }
  });
}

export async function writeAuditLog(action: string, details?: { actorId?: string | null; entityType?: string; entityId?: string; metadata?: unknown }) {
  if (!hasDatabaseUrl()) return;
  await (prisma as any).auditLog.create({
    data: {
      action,
      actorId: details?.actorId ?? null,
      entityType: details?.entityType ?? null,
      entityId: details?.entityId ?? null,
      metadata: details?.metadata ?? undefined
    }
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function sendInviteEmail(email: string, inviteUrl: string, role: AdminRoleName) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, message: `Email is not configured yet. Manual invite link: ${inviteUrl}` };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "You're invited to K&K Kustom Kreations Admin",
      html: `
        <p>You were invited as <strong>${role}</strong>.</p>
        <p><a href="${inviteUrl}">Accept your admin invite</a></p>
        <p>This link expires in 7 days.</p>
      `
    })
  });

  if (!response.ok) {
    return { sent: false, message: `Invite created, but email could not be sent. Manual invite link: ${inviteUrl}` };
  }

  return { sent: true, message: "Invite sent successfully." };
}
