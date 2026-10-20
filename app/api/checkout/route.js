import { NextResponse } from "next/server";
import { mpToken, mpCheckoutUrl, mpSandbox } from "@/lib/mp";
import { ZONES, EVENT, currentPrice } from "@/lib/config";
import { newCode, saveOrder, updateOrder, hasPaidDni, pendingRecent, pendingInZone, getAdvisor, livePendingByDni } from "@/lib/orders";
import { validateBuyer, limited, clientIp, tooLarge, verifyAdvisorRef } from "@/lib/validate";
import { availability } from "@/lib/availability";

const base = () => process.env.BASE_URL || "http://localhost:3100";
const HOLD_MIN = 30; // minutos de reserva del cupo (igual que lib/orders.soldByZone)


export async function POST(req) {
  if (process.env.PREVIEW_MODE === "1")
    return NextResponse.json({ error: "Vista previa de diseño: la compra se activará al publicar la web oficial." }, { status: 503 });
  const big = tooLarge(req, 20_000);
  if (big) return big;
  const ip = clientIp(req);
  if (limited(`co:${ip}`, 8)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }

  const zone = ZONES.find((z) => z.id === b.zone);
  if (!zone) return NextResponse.json({ error: "Zona inválida." }, { status: 400 });

  if (b.website) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); // campo trampa para bots
  const v = validateBuyer(b);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
  const { nombre, dni, telefono, correo, comprobante, ruc, razonSocial } = v.value;
  if (b.acepta !== true) return NextResponse.json({ error: "Debes aceptar los Términos y Condiciones." }, { status: 400 });

  // ¿Ya tiene un pago abierto? Mismo documento y zona → se reutiliza; otra zona → se anula el anterior (nunca dos cobros vivos)
  const prev = livePendingByDni(dni);
  if (prev && prev.zone === zone.id && prev.mpUrl) return NextResponse.json({ url: prev.mpUrl });
  if (prev) updateOrder(prev.code, { status: "cancelled" });

  if (availability()[zone.id].left <= 0) return NextResponse.json({ error: `La Zona ${zone.name} está agotada.` }, { status: 409 });
  // Mensaje genérico: no confirma a terceros si un DNI compró
  if (hasPaidDni(zone.id, dni)) return NextResponse.json({ error: "No pudimos procesar esta compra. Si ya compraste, revisa tu correo o escríbenos por WhatsApp." }, { status: 409 });
  // Tope de reservas sin pagar por zona (15 % del aforo, mín. 10): el resto espera unos minutos
  if (pendingInZone(zone.id) >= Math.max(10, Math.ceil(zone.seats * 0.15)))
    return NextResponse.json({ error: "Hay mucha demanda en esta zona. Intenta de nuevo en unos minutos." }, { status: 429 });

  if (pendingRecent(ip) >= 3) return NextResponse.json({ error: "Ya tienes pedidos pendientes. Completa el pago o espera 30 minutos." }, { status: 429 });

  const price = currentPrice(zone); // el precio SIEMPRE lo define el servidor
  const code = newCode();
  const now = new Date().toISOString();
  const advCode = verifyAdvisorRef(b.advisor); // link firmado ?a=codigo.firma: nadie puede atribuirse ventas ajenas
  const adv = advCode ? getAdvisor(advCode) : null;
  const saved = saveOrder({
    advisorCode: adv?.active ? adv.code : null, advisorName: adv?.active ? adv.name : null,
    clientIp: ip,
    code, zone: zone.id, price, currency: "PEN", nombre, dni, telefono, correo, comprobante,
    ruc: comprobante === "factura" ? ruc : null,
    razonSocial: comprobante === "factura" ? razonSocial : null,
    termsVersion: EVENT.termsVersion, acceptedAt: now, status: "pending", createdAt: now,
  });

  const token = mpToken();
  if (!token) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
      updateOrder(code, { status: "cancelled" });
      return NextResponse.json({ error: "Pagos no disponibles por el momento." }, { status: 503 });
    }
    // MODO DEMO: sin credenciales de Mercado Pago, se simula el pago aprobado.
    updateOrder(code, { status: "paid-demo", paidAt: now });
    return NextResponse.json({ url: `${base()}/gracias?t=${saved.publicToken}&demo=1` });
  }

  let r;
  try {
  r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      items: [{ id: zone.id, title: `${EVENT.short} · Entrada ${zone.name}`, quantity: 1, unit_price: price, currency_id: "PEN" }],
      // En modo de prueba no se envía el comprador: el sandbox de Mercado Pago falla con correos reales
      payer: mpSandbox() ? undefined : { name: nombre, email: correo },
      external_reference: code,
      expires: true,
      expiration_date_to: new Date(Date.now() + HOLD_MIN * 60 * 1000).toISOString(),
      back_urls: {
        success: `${base()}/gracias?t=${saved.publicToken}`,
        pending: `${base()}/gracias?t=${saved.publicToken}`,
        failure: `${base()}/entradas?pago=fallido`,
      },
      auto_return: base().startsWith("https") ? "approved" : undefined,
      notification_url: base().startsWith("https") ? `${base()}/api/webhook` : undefined,
    }),
  });
  } catch { r = null; }
  const data = r ? await r.json().catch(() => ({})) : {};
  const url = mpCheckoutUrl(data, token);
  if (!r?.ok || !url) {
    updateOrder(code, { status: "cancelled" }); // libera el cupo si Mercado Pago no respondió
    return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 502 });
  }
  updateOrder(code, { mpUrl: url });
  return NextResponse.json({ url });
}
