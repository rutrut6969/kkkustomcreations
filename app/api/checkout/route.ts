import { NextResponse } from "next/server";
import { createSquarePaymentLink, parseCheckoutPayload } from "@/lib/square";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseCheckoutPayload(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete cart, customer info, and required consent." }, { status: 400 });
  }

  if ((parsed.data.fulfillmentType === "SHIPPING" || parsed.data.fulfillmentType === "DROPOFF") && !parsed.data.address1) {
    return NextResponse.json({ error: "Address is required for shipping or local dropoff." }, { status: 400 });
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
