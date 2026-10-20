import { NextResponse } from "next/server";
import { getOrderByAcceptToken, updateOrder, firmSold, expireStale } from "@/lib/orders";
import { ZONES } from "@/lib/config";
import { syncOrderToDjango } from "@/lib/django";
import { limited, clientIp, tooLarge } from "@/lib/validate";

// El cliente acepta los T&C desde el link que le envió su asesor. Solo entonces se emite la entrada.
export async function POST(req) {
  const big = tooLarge(req, 4_000);
  if (big) return big;
  if (limited(`acc:${clientIp(req)}`, 12)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const order = getOrderByAcceptToken(String(b.token || ""));
  if (!order) return NextResponse.json({ error: "Este link no es válido." }, { status: 404 });
  if (b.acepta !== true) return NextResponse.json({ error: "Debes aceptar los Términos y Condiciones." }, { status: 400 });
  expireStale();
  if (order.status === "expired" || (order.status === "awaiting_terms" && Date.now() - Date.parse(order.createdAt) > 72 * 3600 * 1000))
    return NextResponse.json({ error: "Este link venció (72 horas). Pide a tu asesor que registre la venta de nuevo." }, { status: 410 });
  if (order.status === "cancelled") return NextResponse.json({ error: "Esta reserva fue anulada. Contacta a tu asesor." }, { status: 410 });

  if (order.status === "awaiting_terms") {
    const now = new Date().toISOString();
    // El pago lo recibió el asesor: pasa a revisión de contabilidad (con su comprobante) antes de emitir la entrada
    const zone = ZONES.find((z) => z.id === order.zone);
    if (zone && firmSold(zone.id) > zone.seats) return NextResponse.json({ error: "La zona se llenó. Tu asesor te contactará." }, { status: 409 });
    const accepted = updateOrder(order.code, { status: "in_review", acceptedAt: now, acceptedIp: clientIp(req) });
    const s = await syncOrderToDjango(accepted);
    if (s?.syncStatus === "error") updateOrder(order.code, { alert: "T&C aceptados pero no llegó al sistema de entradas: reintentar" });
  }
  const fresh = getOrderByAcceptToken(order.acceptToken);
  return NextResponse.json({ ok: true, review: fresh.status === "in_review" });
}
