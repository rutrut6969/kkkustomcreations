"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";

const consentText = "Consent is required.";

export type ActionState = { ok?: boolean; message?: string };

export async function submitCustomOrder(_state: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    itemType: z.string().min(1),
    designRequest: z.string().min(10),
    neededBy: z.string().optional(),
    imageNote: z.string().optional(),
    consent: z.literal("on", { errorMap: () => ({ message: consentText }) })
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please complete the required fields." };
  if (!hasDatabaseUrl()) return { ok: true, message: "Demo mode: your custom request form is ready. Connect DATABASE_URL to save submissions." };

  await prisma.customOrderRequest.create({
    data: {
      ...parsed.data,
      neededBy: parsed.data.neededBy ? new Date(parsed.data.neededBy) : null,
      consent: true
    }
  });
  revalidatePath("/admin");
  return { ok: true, message: "Custom request sent. We will follow up soon." };
}

export async function submitContactMessage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    message: z.string().min(5),
    consent: z.literal("on", { errorMap: () => ({ message: consentText }) }),
    marketingConsent: z.string().optional()
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please complete the required fields." };
  if (!hasDatabaseUrl()) return { ok: true, message: "Demo mode: your contact form is ready. Connect DATABASE_URL to save messages." };

  await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      consent: true,
      marketingConsent: parsed.data.marketingConsent === "on"
    }
  });
  revalidatePath("/admin");
  return { ok: true, message: "Message sent. Thank you!" };
}
