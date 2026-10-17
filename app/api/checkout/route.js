import { NextResponse } from "next/server";
import { ZONES, EVENT, currentPrice } from "@/lib/config";
import { newCode, saveOrder, updateOrder, hasPaidDni, pendingRecent, getAdvisor } from "@/lib/orders";
import { availability } from "@/lib/availability";

const base = () => process.env.BASE_URL || "http://localhost:3100";
const HOLD_MIN = 30; // minutos de reserva del cupo (igual que lib/orders.soldByZone)

// Límite simple por IP (en memoria): 8 intentos por minuto
const hits = globalThis.__edeHits || (globalThis.__edeHits = new Map());
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now); hits.set(ip, list);
  return list.length > 8;
}

export async function POST(req) {
  if (process.env.PREVIEW_MODE === "1")
    return NextResponse.json({ error: "Vista previa de diseño: la compra se activará al publicar la web oficial." }, { status: 503 });
  // Tras un proxy, la última entrada de x-forwarded-for la añade el proxy (la primera la controla el cliente)
  const ip = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }

  const zone = ZONES.find((z) => z.id === b.zone);
  if (!zone) return NextResponse.json({ error: "Zona inválida." }, { status: 400 });

  const nombre = String(b.nombre || "").trim();
  const dni = String(b.dni || "").trim();
  const telefono = String(b.telefono || "").trim();
  const correo = String(b.correo || "").trim();
  const comprobante = b.comprobante === "factura" ? "factura" : "boleta";
  const ruc = String(b.ruc || "").trim();
  const razonSocial = String(b.razonSocial || "").trim();

  if (nombre.length < 3 || nombre.length > 120) return NextResponse.json({ error: "Escribe tu nombre completo." }, { status: 400 });
  if (!/^[A-Za-z0-9]{8,12}$/.test(dni)) return NextResponse.json({ error: "DNI o documento inválido." }, { status: 400 });
  if (!/^\+?[0-9 ]{7,15}$/.test(telefono)) return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(correo) || correo.length > 160) return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
  if (comprobante === "factura" && (!/^\d{11}$/.test(ruc) || razonSocial.length < 3))
    return NextResponse.json({ error: "Para factura indica RUC (11 dígitos) y razón social." }, { status: 400 });
  if (b.acepta !== true) return NextResponse.json({ error: "Debes aceptar los Términos y Condiciones." }, { status: 400 });

  if (availability()[zone.id].left <= 0) return NextResponse.json({ error: `La Zona ${zone.name} está agotada.` }, { status: 409 });
  if (hasPaidDni(zone.id, dni)) return NextResponse.json({ error: "Este documento ya tiene una entrada pagada en esta zona." }, { status: 409 });

  if (pendingRecent(dni, correo) >= 3) return NextResponse.json({ error: "Ya tienes pedidos pendientes. Completa el pago o espera 30 minutos." }, { status: 429 });

  const price = currentPrice(zone); // el precio SIEMPRE lo define el servidor
  const code = newCode();
  const now = new Date().toISOString();
  const adv = b.advisor ? getAdvisor(String(b.advisor)) : null; // venta atribuida al link de un asesor
  const saved = saveOrder({
    advisorCode: adv?.active ? adv.code : null, advisorName: adv?.active ? adv.name : null,
    code, zone: zone.id, price, currency: "PEN", nombre, dni, telefono, correo, comprobante,
    ruc: comprobante === "factura" ? ruc : null,
    razonSocial: comprobante === "factura" ? razonSocial : null,
    termsVersion: EVENT.termsVersion, acceptedAt: now, status: "pending", createdAt: now,
  });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
      updateOrder(code, { status: "cancelled" });
      return NextResponse.json({ error: "Pagos no disponibles por el momento." }, { status: 503 });
    }
    // MODO DEMO: sin credenciales de Mercado Pago, se simula el pago aprobado.
    updateOrder(code, { status: "paid-demo", paidAt: now });
    return NextResponse.json({ url: `${base()}/gracias?t=${saved.publicToken}&demo=1` });
  }

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: zone.id, title: `${EVENT.short} · Entrada ${zone.name}`, quantity: 1, unit_price: price, currency_id: "PEN" }],
      payer: { name: nombre, email: correo },
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
  const data = await r.json();
  if (!r.ok) return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 502 });
  const url = token.startsWith("TEST-") ? data.sandbox_init_point || data.init_point : data.init_point;
  return NextResponse.json({ url });
}
