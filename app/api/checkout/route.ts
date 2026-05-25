import { NextResponse } from "next/server";
import { calculateServerCheckoutTotals, createSquarePaymentLink, parseCheckoutPayload } from "@/lib/square";
import { validateCheckoutInventory } from "@/lib/cart-validation";
import { guardPublicSubmission, hasUsableCustomerInfo } from "@/lib/anti-bot";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseCheckoutPayload(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete cart, customer info, and required consent." }, { status: 400 });
  }

  if ((parsed.data.fulfillmentType === "SHIPPING" || parsed.data.fulfillmentType === "DROPOFF") && !parsed.data.address1) {
    return NextResponse.json({ error: "Address is required for shipping or local dropoff." }, { status: 400 });
  }
  const guard = await guardPublicSubmission({ formType: "checkout", body, email: parsed.data.email, phone: parsed.data.phone, minSubmitMs: 2500 });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 429 });
  if (!hasUsableCustomerInfo({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone })) {
    return NextResponse.json({ error: "Please enter valid customer contact information." }, { status: 400 });
  }
  try {
    await calculateServerCheckoutTotals(parsed.data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fulfillment settings are not available." }, { status: 400 });
  }
  const inventoryError = await validateCheckoutInventory(parsed.data.items);
  if (inventoryError) {
    return NextResponse.json({ error: inventoryError }, { status: 409 });
  }

  try {
    const url = await createSquarePaymentLink(parsed.data);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start Square checkout." },
      { status: 500 }
    );
  }
}
