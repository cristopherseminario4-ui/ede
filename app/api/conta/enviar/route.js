import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff";
import { getOrder, updateOrder } from "@/lib/orders";
import { sendComprobanteMail } from "@/lib/mail";

// Reenvía por correo un comprobante ya registrado.
export async function POST(req) {
  const { res } = await requireStaff();
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const order = getOrder(String(b.code || ""));
  if (!order?.docToken) return NextResponse.json({ error: "Esta venta aún no tiene comprobante." }, { status: 400 });
  const r = await sendComprobanteMail(order);
  updateOrder(order.code, r.ok ? { docSentAt: new Date().toISOString(), docMailError: null } : { docMailError: r.error });
  return NextResponse.json(r.ok ? { ok: true } : { error: r.error }, { status: r.ok ? 200 : 502 });
}
