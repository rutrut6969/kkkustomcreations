import "server-only";

import { prisma, hasDatabaseUrl } from "@/lib/prisma";

export type ReportRange = {
  from: Date;
  to: Date;
};

export function rangeFromParams(period = "monthly", from?: string, to?: string): ReportRange {
  const now = new Date();
  const end = to ? new Date(`${to}T23:59:59`) : now;
  let start = from ? new Date(`${from}T00:00:00`) : new Date(now);
  if (!from) {
    if (period === "daily") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === "weekly") start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    else if (period === "yearly") start = new Date(now.getFullYear(), 0, 1);
    else start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: start, to: end };
}

export async function getSalesReport(range: ReportRange) {
  if (!hasDatabaseUrl()) {
    return {
      grossSales: 0,
      orderCount: 0,
      averageOrderValue: 0,
      topProducts: [],
      fulfillment: [],
      paymentStatus: [],
      inventoryMovement: [],
      orders: []
    };
  }
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      deletedAt: null,
      archivedAt: null
    },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  const grossSales = orders.filter((order) => order.paymentStatus === "PAID").reduce((sum, order) => sum + order.totalCents, 0);
  const orderCount = orders.length;
  const products = new Map<string, { productName: string; units: number; salesCents: number }>();
  const fulfillment = new Map<string, number>();
  const paymentStatus = new Map<string, number>();
  const inventoryMovement = new Map<string, number>();
  for (const order of orders) {
    fulfillment.set(order.fulfillmentType, (fulfillment.get(order.fulfillmentType) ?? 0) + 1);
    paymentStatus.set(order.paymentStatus, (paymentStatus.get(order.paymentStatus) ?? 0) + 1);
    for (const item of order.items) {
      const existing = products.get(item.productName) ?? { productName: item.productName, units: 0, salesCents: 0 };
      existing.units += item.quantity;
      existing.salesCents += item.totalCents;
      products.set(item.productName, existing);
      inventoryMovement.set(item.productName, (inventoryMovement.get(item.productName) ?? 0) + item.quantity);
    }
  }
  return {
    grossSales,
    orderCount,
    averageOrderValue: orderCount ? Math.round(grossSales / orderCount) : 0,
    topProducts: Array.from(products.values()).sort((a, b) => b.salesCents - a.salesCents).slice(0, 10),
    fulfillment: Array.from(fulfillment.entries()).map(([label, count]) => ({ label, count })),
    paymentStatus: Array.from(paymentStatus.entries()).map(([label, count]) => ({ label, count })),
    inventoryMovement: Array.from(inventoryMovement.entries()).map(([productName, units]) => ({ productName, units })),
    orders
  };
}

export function reportToCsv(report: Awaited<ReturnType<typeof getSalesReport>>) {
  const lines = [
    ["Metric", "Value"],
    ["Gross sales cents", String(report.grossSales)],
    ["Order count", String(report.orderCount)],
    ["Average order value cents", String(report.averageOrderValue)],
    [],
    ["Top Product", "Units", "Sales Cents"],
    ...report.topProducts.map((product) => [product.productName, String(product.units), String(product.salesCents)]),
    [],
    ["Order Number", "Customer", "Status", "Payment", "Total Cents", "Created"],
    ...report.orders.map((order) => [order.orderNumber, order.customerName, order.status, order.paymentStatus, String(order.totalCents), order.createdAt.toISOString()])
  ];
  return lines.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}
