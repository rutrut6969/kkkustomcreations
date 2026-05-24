import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ExportCustomer = {
  name: string;
  email: string | null;
  phone: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country?: string | null;
  totalSpentCents?: number;
  lastOrderAt?: Date | null;
  marketingConsent?: boolean;
  orderConsent?: boolean;
  _count: { orders: number };
};

function quote(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export async function GET(request: Request) {
  if (cookies().get("kk_admin_session")?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "DATABASE_URL is required." }, { status: 500 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  const customers = await (prisma.customer as any).findMany({
    where: format === "meta" ? { marketingConsent: true } : undefined,
    include: { _count: { select: { orders: true } } },
    orderBy: [{ lastOrderAt: "desc" }, { updatedAt: "desc" }]
  }) as ExportCustomer[];

  const rows =
    format === "meta"
      ? [
          ["email", "phone", "first name", "last name", "city", "state", "ZIP", "country"],
          ...customers.map((customer) => {
            const { firstName, lastName } = splitName(customer.name);
            return [customer.email, customer.phone, firstName, lastName, customer.city, customer.state, customer.postalCode, customer.country ?? "US"];
          })
        ]
      : [
          ["name", "email", "phone", "address", "city", "state", "ZIP", "country", "orders", "total spent", "last order", "marketing consent", "order consent"],
          ...customers.map((customer) => [
            customer.name,
            customer.email,
            customer.phone,
            customer.address1,
            customer.city,
            customer.state,
            customer.postalCode,
            customer.country ?? "US",
            customer._count.orders,
            ((customer.totalSpentCents ?? 0) / 100).toFixed(2),
            customer.lastOrderAt?.toISOString() ?? "",
            customer.marketingConsent ? "yes" : "no",
            customer.orderConsent ? "yes" : "no"
          ])
        ];

  const body = rows.map((row) => row.map(quote).join(",")).join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kk-customers-${format}.csv"`
    }
  });
}
