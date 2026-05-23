import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { OrderStatus, PaymentStatus, SquareSyncStatus } from "@prisma/client";
import { adjustInventoryForPaidOrder } from "@/lib/inventory";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { importSquareOrders, setSquareSetting, writeSquareSyncLog } from "@/lib/square-sync";

function webhookUrl(request: Request) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin}/api/square/webhook`;
}

function verifySquareSignature(rawBody: string, signature: string | null, request: Request) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signature) return false;
  const hash = createHmac("sha256", key).update(webhookUrl(request) + rawBody).digest("base64");
  const expected = Buffer.from(hash);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function squarePaymentFromPayload(payload: any) {
  return payload?.data?.object?.payment ?? payload?.payment ?? null;
}

function squareOrderFromPayload(payload: any) {
  return payload?.data?.object?.order ?? payload?.order ?? null;
}

async function reconcileCompletedOrder(squareOrderId?: string | null, squarePaymentId?: string | null) {
  if (!hasDatabaseUrl()) return;
  let order = await prisma.order.findFirst({
    where: {
      OR: [
        squareOrderId ? { squareOrderId } : undefined,
        squarePaymentId ? { squarePaymentId } : undefined
      ].filter(Boolean) as { squareOrderId?: string; squarePaymentId?: string }[]
    }
  });

  if (!order && squareOrderId) {
    await importSquareOrders();
    order = await prisma.order.findFirst({ where: { squareOrderId } });
  }
  if (!order) {
    await writeSquareSyncLog("webhook.inventory", SquareSyncStatus.SKIPPED, "Webhook received for an order that is not yet matched locally.", { squareOrderId, squarePaymentId });
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      squareOrderId: squareOrderId ?? order.squareOrderId,
      squarePaymentId: squarePaymentId ?? order.squarePaymentId,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
      webhookProcessedAt: new Date(),
      syncStatus: SquareSyncStatus.SYNCED,
      syncError: null
    }
  });
  await setSquareSetting("squareLastSuccessfulCheckout", new Date().toLocaleString());
  await adjustInventoryForPaidOrder(order.id, squarePaymentId ?? squareOrderId ?? undefined);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");
  if (!verifySquareSignature(rawBody, signature, request)) {
    return NextResponse.json({ error: "Invalid Square webhook signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const type = String(payload.type ?? "");
  try {
    if (type.includes("payment")) {
      const payment = squarePaymentFromPayload(payload);
      if (payment?.status === "COMPLETED" || payment?.status === "APPROVED") {
        await reconcileCompletedOrder(payment.order_id, payment.id);
      }
    } else if (type.includes("order")) {
      const order = squareOrderFromPayload(payload);
      if (order?.state === "COMPLETED" || order?.state === "OPEN") {
        await reconcileCompletedOrder(order.id, null);
      }
    }
    await writeSquareSyncLog("webhook.received", SquareSyncStatus.SYNCED, `Processed Square webhook ${type || "unknown"}.`, { type });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Square webhook processing failed.";
    await writeSquareSyncLog("webhook.received", SquareSyncStatus.ERROR, message, { type });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
