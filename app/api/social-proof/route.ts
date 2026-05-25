import { NextResponse } from "next/server";
import { getSocialProofPurchases } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const purchases = await getSocialProofPurchases();
  return NextResponse.json(
    { purchases },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    }
  );
}
