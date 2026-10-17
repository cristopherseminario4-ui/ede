import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getOrder, updateOrder } from "@/lib/orders";
import { syncOrderToDjango } from "@/lib/django";

const ALLOWED = ["pending", "paid", "cancelled"];

// Cambiar estado a mano (p. ej. confirmar un voucher de Yape/transferencia).
export async function PATCH(req, { params }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { code } = await params;
  if (!getOrder(code)) return NextResponse.json({ error: "Pedido no existe" }, { status: 404 });
  const { status } = await req.json().catch(() => ({}));
  if (!ALLOWED.includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  const order = updateOrder(code, { status, paidAt: status === "paid" ? new Date().toISOString() : null });
  if (status === "paid" && order.syncStatus !== "ok") return NextResponse.json({ order: await syncOrderToDjango(order) });
  return NextResponse.json({ order });
}
