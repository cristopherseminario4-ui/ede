import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getOrder, updateOrder, firmSold } from "@/lib/orders";
import { syncOrderToDjango } from "@/lib/django";
import { ZONES } from "@/lib/config";
import { limited, clientIp, tooLarge } from "@/lib/validate";

// Firma x-signature de Mercado Pago. En producción es obligatoria (sin secreto, el webhook no procesa nada).
function firmaValida(req, id) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const sig = req.headers.get("x-signature") || "";
  const ts = /ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const tsMs = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
  if (!tsMs || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) return false; // evita reenviar notificaciones viejas
  const manifest = `id:${String(id).toLowerCase()};request-id:${req.headers.get("x-request-id") || ""};ts:${ts};`;
  const h = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(v1)); } catch { return false; }
}

// Mercado Pago notifica aquí (requiere URL pública https; en local no se invoca).
export async function POST(req) {
  if (limited(`wh:${clientIp(req)}`, 120)) return NextResponse.json({ ok: false }, { status: 429 });
  const token = process.env.MP_ACCESS_TOKEN;
  const url = new URL(req.url);
  let id = url.searchParams.get("data.id") || url.searchParams.get("id");
  if (!id) {
    if (tooLarge(req, 20_000)) return NextResponse.json({ ok: false }, { status: 413 });
    try { id = (await req.json())?.data?.id; } catch {}
  }
  if (!id || !token || !/^\d{1,20}$/.test(String(id))) return NextResponse.json({ ok: true });
  if (!firmaValida(req, id)) return NextResponse.json({ error: "firma inválida" }, { status: 401 });

  let p;
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return NextResponse.json({ ok: false }, { status: 502 });
    p = await r.json();
  } catch { return NextResponse.json({ ok: false }, { status: 502 }); } // Mercado Pago reintentará

  const order = p.external_reference && getOrder(p.external_reference);
  // El pago debe estar aprobado y coincidir en monto y moneda con el pedido (el precio lo fijó el servidor)
  if (!order || p.status !== "approved" || p.currency_id !== order.currency || Number(p.transaction_amount) !== Number(order.price))
    return NextResponse.json({ ok: true });

  if (order.status === "pending") {
    // Si el pago llegó tarde y la zona ya se llenó, se respeta el pago pero queda una alerta para administración
    const zone = ZONES.find((z) => z.id === order.zone);
    const over = zone && firmSold(zone.id) >= zone.seats;
    const paid = updateOrder(order.code, { status: "paid", paidAt: new Date().toISOString(), mpPaymentId: String(id), alert: over ? "SOBREVENTA: pago aprobado con la zona llena" : null });
    const s = await syncOrderToDjango(paid);
    if (s?.syncStatus === "error") return NextResponse.json({ ok: false }, { status: 502 }); // fuerza el reintento
  } else if (order.status === "paid" && order.syncStatus !== "ok") {
    const s = await syncOrderToDjango(order);
    if (s?.syncStatus === "error") return NextResponse.json({ ok: false }, { status: 502 });
  } else if (order.status === "cancelled") {
    // Un pedido anulado no revive; se deja constancia para revisar un posible reembolso
    updateOrder(order.code, { alert: `Pago aprobado (MP ${id}) sobre un pedido anulado: revisar reembolso` });
  }
  return NextResponse.json({ ok: true });
}
