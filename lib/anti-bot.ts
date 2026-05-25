import "server-only";

import { headers } from "next/headers";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

type PublicFormType = "checkout" | "contact" | "custom-order" | "newsletter";

type GuardInput = {
  formType: PublicFormType;
  formData?: FormData;
  body?: Record<string, unknown>;
  email?: string | null;
  phone?: string | null;
  minSubmitMs?: number;
};

type GuardResult =
  | { ok: true; ipAddress: string; email: string | null; phone: string | null }
  | { ok: false; fakeSuccess?: boolean; message: string; ipAddress: string; email: string | null; phone: string | null };

const memoryAttempts = new Map<string, number[]>();
const windowMs = 15 * 60 * 1000;

function value(input: GuardInput, key: string) {
  const formValue = input.formData?.get(key);
  if (typeof formValue === "string") return formValue;
  const bodyValue = input.body?.[key];
  return typeof bodyValue === "string" ? bodyValue : "";
}

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.includes("@") ? normalized : null;
}

function normalizePhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? digits : null;
}

function clientIp() {
  const headerStore = headers();
  return (
    headerStore.get("cf-connecting-ip") ??
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown"
  );
}

async function verifyTurnstile(token: string, ipAddress: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ipAddress })
  });
  const result = await response.json().catch(() => null);
  return Boolean(result?.success);
}

async function verifyRecaptcha(token: string, ipAddress: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY || process.env.GOOGLE_RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ipAddress })
  });
  const result = await response.json().catch(() => null);
  return Boolean(result?.success);
}

async function countRecent(where: Record<string, unknown>) {
  if (!hasDatabaseUrl()) return 0;
  return (prisma as any).submissionAttempt.count({
    where: {
      ...where,
      createdAt: { gte: new Date(Date.now() - windowMs) }
    }
  }) as Promise<number>;
}

function pruneMemory(key: string) {
  const cutoff = Date.now() - windowMs;
  const attempts = (memoryAttempts.get(key) ?? []).filter((timestamp) => timestamp >= cutoff);
  memoryAttempts.set(key, attempts);
  return attempts;
}

function countMemory(key: string) {
  return pruneMemory(key).length;
}

function recordMemory(key: string) {
  const attempts = pruneMemory(key);
  attempts.push(Date.now());
  memoryAttempts.set(key, attempts);
}

async function recordAttempt(input: {
  formType: PublicFormType;
  ipAddress: string;
  email: string | null;
  phone: string | null;
  accepted: boolean;
  reason?: string;
}) {
  if (!hasDatabaseUrl()) {
    recordMemory(`ip:${input.ipAddress}`);
    if (input.email) recordMemory(`email:${input.email}`);
    if (input.phone) recordMemory(`phone:${input.phone}`);
    return;
  }
  await (prisma as any).submissionAttempt.create({
    data: {
      formType: input.formType,
      ipAddress: input.ipAddress,
      email: input.email,
      phone: input.phone,
      accepted: input.accepted,
      reason: input.reason ?? null
    }
  }).catch(() => undefined);
}

export async function guardPublicSubmission(input: GuardInput): Promise<GuardResult> {
  const ipAddress = clientIp();
  const email = normalizeEmail(input.email ?? value(input, "email"));
  const phone = normalizePhone(input.phone ?? value(input, "phone"));
  const minSubmitMs = input.minSubmitMs ?? 1800;
  const startedAt = Number(value(input, "kk_started_at"));
  const honeypot = value(input, "kk_website") || value(input, "website");
  const turnstileToken = value(input, "cf-turnstile-response") || value(input, "turnstileToken");
  const recaptchaToken = value(input, "g-recaptcha-response") || value(input, "recaptchaToken");

  if (honeypot.trim()) {
    await recordAttempt({ formType: input.formType, ipAddress, email, phone, accepted: false, reason: "honeypot" });
    return { ok: false, fakeSuccess: input.formType !== "checkout", message: "Thanks, your submission was received.", ipAddress, email, phone };
  }

  if (!Number.isFinite(startedAt) || Date.now() - startedAt < minSubmitMs) {
    await recordAttempt({ formType: input.formType, ipAddress, email, phone, accepted: false, reason: "too_fast" });
    return { ok: false, fakeSuccess: input.formType !== "checkout", message: "Please wait a moment and try again.", ipAddress, email, phone };
  }

  const turnstileOk = await verifyTurnstile(turnstileToken, ipAddress);
  const recaptchaOk = await verifyRecaptcha(recaptchaToken, ipAddress);
  if (!turnstileOk || !recaptchaOk) {
    await recordAttempt({ formType: input.formType, ipAddress, email, phone, accepted: false, reason: "challenge_failed" });
    return { ok: false, message: "Security check failed. Please refresh and try again.", ipAddress, email, phone };
  }

  const [ipCount, emailCount, phoneCount] = await Promise.all([
    hasDatabaseUrl() ? countRecent({ ipAddress }) : Promise.resolve(countMemory(`ip:${ipAddress}`)),
    email ? (hasDatabaseUrl() ? countRecent({ email }) : Promise.resolve(countMemory(`email:${email}`))) : Promise.resolve(0),
    phone ? (hasDatabaseUrl() ? countRecent({ phone }) : Promise.resolve(countMemory(`phone:${phone}`))) : Promise.resolve(0)
  ]);

  if (ipCount > 12 || emailCount > 5 || phoneCount > 5) {
    await recordAttempt({ formType: input.formType, ipAddress, email, phone, accepted: false, reason: "rate_limited" });
    return { ok: false, message: "Too many submissions. Please wait a few minutes and try again.", ipAddress, email, phone };
  }

  await recordAttempt({ formType: input.formType, ipAddress, email, phone, accepted: true });
  return { ok: true, ipAddress, email, phone };
}

export function hasUsableCustomerInfo(customer: { name?: string | null; email?: string | null; phone?: string | null }) {
  const name = customer.name?.trim() ?? "";
  const genericNames = new Set(["square customer", "square order", "customer", "unknown"]);
  return Boolean(normalizeEmail(customer.email) || normalizePhone(customer.phone) || (name.length >= 2 && !genericNames.has(name.toLowerCase())));
}
