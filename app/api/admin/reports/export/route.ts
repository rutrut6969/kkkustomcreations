import { NextResponse } from "next/server";
import { getSalesReport, rangeFromParams, reportToCsv } from "@/lib/reports";

export async function GET(request: Request) {
  if (!request.headers.get("cookie")?.includes("kk_admin_session=authenticated")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const range = rangeFromParams(url.searchParams.get("period") ?? "monthly", url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const report = await getSalesReport(range);
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json({ range, report });
  }
  return new NextResponse(reportToCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kk-report-${range.from.toISOString().slice(0, 10)}-${range.to.toISOString().slice(0, 10)}.csv"`
    }
  });
}
