import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/orders";
import { syncOrderToDjango } from "@/lib/django";

// Reintenta enviar un pedido pagado al sistema Django (idempotente: usa el código del pedido como referencia).
export async function POST(req, { params }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { code } = await params;
  const order = getOrder(code);
  if (!order) return NextResponse.json({ error: "Pedido no existe" }, { status: 404 });
  if (order.status !== "paid") return NextResponse.json({ error: "Solo se sincronizan pedidos pagados (no demo)" }, { status: 400 });
  return NextResponse.json({ order: await syncOrderToDjango(order) });
}
