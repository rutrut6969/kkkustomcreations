import { NextResponse } from "next/server";
import { squareWebSdkConfig } from "@/lib/square";

export async function GET() {
  try {
    return NextResponse.json(await squareWebSdkConfig());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Square Web Payments is not configured." },
      { status: 500 }
    );
  }
}
