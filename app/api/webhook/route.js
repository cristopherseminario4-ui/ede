import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/orders";
import { syncOrderToDjango } from "@/lib/django";

// Valida x-signature de Mercado Pago cuando MP_WEBHOOK_SECRET está definido.
function firmaValida(req, id) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = req.headers.get("x-signature") || "";
  const ts = /ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const manifest = `id:${String(id).toLowerCase()};request-id:${req.headers.get("x-request-id") || ""};ts:${ts};`;
  const h = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(v1)); } catch { return false; }
}

// Mercado Pago notifica aquí (requiere URL pública https; en local no se invoca).
export async function POST(req) {
  const token = process.env.MP_ACCESS_TOKEN;
  const url = new URL(req.url);
  let id = url.searchParams.get("data.id") || url.searchParams.get("id");
  if (!id) { try { id = (await req.json())?.data?.id; } catch {} }
  if (!id || !token) return NextResponse.json({ ok: true });
  if (!firmaValida(req, id)) return NextResponse.json({ error: "firma inválida" }, { status: 401 });

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return NextResponse.json({ ok: false }, { status: 502 });
  const p = await r.json();
  const order = p.external_reference && getOrder(p.external_reference);
  // El pago debe estar aprobado y coincidir en monto y moneda con el pedido (el precio lo fijó el servidor)
  if (!order || p.status !== "approved" || p.currency_id !== order.currency || Number(p.transaction_amount) !== Number(order.price))
    return NextResponse.json({ ok: true });
  if (order.status !== "paid") {
    const paid = updateOrder(order.code, { status: "paid", paidAt: new Date().toISOString(), mpPaymentId: String(id) });
    await syncOrderToDjango(paid); // crea al participante en Django y dispara su QR/correo/WhatsApp
  } else if (order.syncStatus !== "ok") {
    await syncOrderToDjango(order);
  }
  return NextResponse.json({ ok: true });
}
