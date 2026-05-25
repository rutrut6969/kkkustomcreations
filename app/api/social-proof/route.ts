import { NextResponse } from "next/server";
import { getSocialProofPurchases } from "@/lib/data";

export async function GET() {
  const purchases = await getSocialProofPurchases();
  return NextResponse.json({ purchases });
}
