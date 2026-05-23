import { NextResponse } from "next/server";
import { FulfillmentType, OrderStatus, PaymentStatus, SquareSyncStatus } from "@prisma/client";
import { createSquarePayment, parseDirectPaymentPayload } from "@/lib/square";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { adjustInventoryForPaidOrder } from "@/lib/inventory";
import { setSquareSetting, writeSquareSyncLog } from "@/lib/square-sync";

function orderNumber() {
  return `KK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseDirectPaymentPayload(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete payment, cart, customer info, and required consent." }, { status: 400 });
  }

  if ((parsed.data.fulfillmentType === "SHIPPING" || parsed.data.fulfillmentType === "DROPOFF") && !parsed.data.address1) {
    return NextResponse.json({ error: "Address is required for shipping or local dropoff." }, { status: 400 });
  }

  try {
    const payment = await createSquarePayment(parsed.data);
    const totalCents = parsed.data.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    let localOrderId: string | null = null;

    if (hasDatabaseUrl()) {
      try {
        const customer = await prisma.customer.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone,
            address1: parsed.data.address1 || null,
            city: parsed.data.city || null,
            state: parsed.data.state || null,
            postalCode: parsed.data.postalCode || null
          }
        });
        const order = await prisma.order.create({
          data: {
            orderNumber: orderNumber(),
            customerId: customer.id,
            customerName: parsed.data.name,
            customerEmail: parsed.data.email,
            customerPhone: parsed.data.phone,
            fulfillmentType: parsed.data.fulfillmentType as FulfillmentType,
            paymentStatus: payment.status === "COMPLETED" ? PaymentStatus.PAID : PaymentStatus.PENDING,
            status: payment.status === "COMPLETED" ? OrderStatus.PAID : OrderStatus.PENDING,
            subtotalCents: totalCents,
            totalCents,
            notes: parsed.data.notes || null,
            squareOrderId: payment.order_id || null,
            squarePaymentId: payment.id,
            address1: parsed.data.address1 || null,
            city: parsed.data.city || null,
            state: parsed.data.state || null,
            postalCode: parsed.data.postalCode || null,
            items: {
              create: parsed.data.items.map((item) => ({
                productId: item.productId,
                productName: item.name,
                quantity: item.quantity,
                unitPriceCents: item.priceCents,
                totalCents: item.priceCents * item.quantity,
                customizationNotes: parsed.data.notes || null
              }))
            }
          }
        });
        localOrderId = order.id;
        await setSquareSetting("squareLastSuccessfulCheckout", new Date().toLocaleString());
        if (payment.status === "COMPLETED") {
          try {
            await adjustInventoryForPaidOrder(order.id, payment.id);
          } catch (inventoryError) {
            await writeSquareSyncLog("inventory.adjust", SquareSyncStatus.ERROR, inventoryError instanceof Error ? inventoryError.message : "Inventory adjustment failed after checkout.", { orderId: order.id, squarePaymentId: payment.id }).catch(() => undefined);
          }
        }
      } catch (orderError) {
        console.warn("Square payment succeeded but local order save failed:", orderError);
        await writeSquareSyncLog("checkout.localOrder", SquareSyncStatus.ERROR, orderError instanceof Error ? orderError.message : "Square payment succeeded but local order save failed.", { squarePaymentId: payment.id }).catch(() => undefined);
      }
    }

    return NextResponse.json({ paymentId: payment.id, localOrderId, status: payment.status ?? "COMPLETED" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete Square payment." },
      { status: 500 }
    );
  }
}
