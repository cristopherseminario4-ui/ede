import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getOrder, updateOrder } from "@/lib/orders";
import { syncOrderToDjango } from "@/lib/django";

// Transiciones permitidas a mano (de → a)
const NEXT = {
  pending: ["paid", "cancelled"],
  awaiting_terms: ["cancelled"],
  in_review: ["paid", "cancelled"],
  separated: ["cancelled"], // "paid" = contabilidad ya confirmó en el sistema de entradas
  paid: ["cancelled"],
  "paid-demo": ["cancelled"],
};

// Cambiar estado a mano (p. ej. confirmar un voucher de Yape/transferencia).
export async function PATCH(req, { params }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { code } = await params;
  const cur = getOrder(code);
  if (!cur) return NextResponse.json({ error: "Pedido no existe" }, { status: 404 });
  const { status } = await req.json().catch(() => ({}));
  if (!(NEXT[cur.status] || []).includes(status)) return NextResponse.json({ error: `No se puede pasar de "${cur.status}" a "${status}".` }, { status: 400 });
  if (status === "cancelled" && cur.docNumber) return NextResponse.json({ error: `Tiene comprobante ${cur.docNumber}: emite primero la nota de crédito y anula a mano.` }, { status: 400 });
  const patch = { status };
  if (status === "paid") patch.paidAt = new Date().toISOString();
  if (status === "cancelled" && cur.syncStatus === "ok") patch.alert = "Anulado aquí: anúlalo también en el sistema de entradas";
  const order = updateOrder(code, patch);
  if (status === "paid" && cur.status === "pending" && order.syncStatus !== "ok") return NextResponse.json({ order: await syncOrderToDjango(order) });
  return NextResponse.json({ order });
}
