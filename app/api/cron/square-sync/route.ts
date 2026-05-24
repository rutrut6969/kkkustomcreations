import { NextResponse } from "next/server";
import { importSquareOrders, pullSquareCatalogIntoWebsite } from "@/lib/square-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("token");
    if (token !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { task: string; ok: boolean; message: string }[] = [];
  for (const [task, run] of [
    ["catalog", pullSquareCatalogIntoWebsite],
    ["orders", importSquareOrders]
  ] as const) {
    try {
      results.push({ task, ok: true, message: await run() });
    } catch (error) {
      results.push({ task, ok: false, message: error instanceof Error ? error.message : "Sync failed." });
    }
  }

  const ok = results.every((result) => result.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 207 });
}
