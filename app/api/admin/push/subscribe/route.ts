import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  if (cookies().get("kk_admin_session")?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const endpoint = String(body.endpoint ?? "");
  const p256dh = String(body.keys?.p256dh ?? "");
  const auth = String(body.keys?.auth ?? "");
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

  const email = cookies().get("kk_admin_email")?.value;
  const adminUser = email ? await (prisma as any).adminUser.findUnique({ where: { email } }) : null;
  await (prisma as any).adminPushSubscription.upsert({
    where: { endpoint },
    create: {
      adminUserId: adminUser?.id ?? null,
      endpoint,
      p256dh,
      auth,
      enabled: true
    },
    update: {
      adminUserId: adminUser?.id ?? null,
      p256dh,
      auth,
      enabled: true
    }
  });
  await (prisma as any).auditLog.create({
    data: {
      actorId: adminUser?.id ?? null,
      action: "admin.push.subscribed",
      entityType: "AdminPushSubscription",
      metadata: { endpoint }
    }
  });
  return NextResponse.json({ ok: true });
}
