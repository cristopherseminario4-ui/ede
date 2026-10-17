import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listOrders } from "@/lib/orders";
import { availability } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const orders = listOrders();
  const paid = orders.filter((o) => o.status === "paid" || o.status === "paid-demo");
  return NextResponse.json({
    orders,
    availability: availability(),
    totals: {
      orders: orders.length,
      paid: paid.length,
      revenue: paid.filter((o) => o.status === "paid").reduce((a, o) => a + o.price, 0),
    },
  });
}
