// Puente con el sistema Django existente (webcliente): al confirmarse un pago se registra al participante allá,
// y Django genera el QR oficial (/validar/<token>/) y envía el correo/WhatsApp con su propia lógica.
import { ZONES } from "@/lib/config";
import { updateOrder } from "@/lib/orders";

const cfg = () => ({
  url: (process.env.DJANGO_API_URL || "").replace(/\/$/, ""),
  key: process.env.DJANGO_API_KEY || "",
  evento: Number(process.env.DJANGO_EVENTO_ID || 1),
  // Nombre de la Tarifa en Django por zona. Ej: {"emprendedor":"EMPRENDEDOR","vip":"VIP","empresarial":"EMPRESARIAL"}
  tarifas: (() => { try { return JSON.parse(process.env.DJANGO_TARIFAS || "{}"); } catch { return {}; } })(),
});

const METODO = { mercadopago: "Mercado Pago", yape: "Yape", plin: "Plin", transferencia: "Transferencia", efectivo: "Efectivo", deposito: "Depósito" };

export const djangoEnabled = () => { const c = cfg(); return !!(c.url && c.key); };

export async function syncOrderToDjango(order) {
  const c = cfg();
  if (!c.url || !c.key) return updateOrder(order.code, { syncStatus: "skipped", syncError: "DJANGO_API_URL/DJANGO_API_KEY no configurados", syncAt: new Date().toISOString() });
  const zone = ZONES.find((z) => z.id === order.zone);
  const partes = order.nombre.trim().split(/\s+/);
  const nombres = partes.length > 2 ? partes.slice(0, Math.ceil(partes.length / 2)).join(" ") : partes[0];
  const apellidos = partes.slice(nombres.split(" ").length).join(" ");
  const via = order.advisorName ? `Asesor: ${order.advisorName}` : "";
  const tc = order.acceptedAt ? `T&C ${order.termsVersion} aceptados ${order.acceptedAt}${order.acceptedIp ? ` (IP ${order.acceptedIp})` : ""}` : "";
  const notas = [`Web EDE · pedido ${order.code}`, via, tc, order.manualRef ? `Ref. pago: ${order.manualRef}` : "", `Comprobante: ${order.comprobante}`, order.ruc ? `RUC ${order.ruc} · ${order.razonSocial}` : "", order.mpPaymentId ? `MP #${order.mpPaymentId}` : ""]
    .filter(Boolean).join(" | ");
  const now = new Date().toISOString();
  const manual = order.paymentMethod && order.paymentMethod !== "mercadopago";
  const voucher = order.voucherToken ? `${(process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "")}/v/${order.voucherToken}` : "";
  try {
    const r = await fetch(`${c.url}/api/registrar-participante/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": c.key },
      body: JSON.stringify({
        evento_id: c.evento, nombres, apellidos, dni: order.dni, celular: order.telefono, correo: order.correo,
        tipo_entrada: c.tarifas[order.zone] || zone?.name?.toUpperCase() || order.zone,
        tipo_tarifa: "pre1", precio_final: order.price, cantidad: 1,
        pago_confirmado: !manual, voucher_url: voucher || undefined, metodo_pago: METODO[order.paymentMethod] || "Mercado Pago", vendedor: order.advisorName || "Web EDE",
        referencia: order.code, // idempotente: reintentar no duplica
        estricto: true, enviar_entrada: !manual, // venta manual: contabilidad confirma el pago en Django y recién ahí sale la entrada
        notas: manual ? `PENDIENTE DE CONTABILIDAD · ${notas}` : notas,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) return updateOrder(order.code, { syncStatus: "ok", syncError: null, syncAt: now, djangoId: j.id ?? null });
    return updateOrder(order.code, { syncStatus: "error", syncError: `${r.status} ${j.error || ""}`.trim().slice(0, 300), syncAt: now });
  } catch (e) {
    return updateOrder(order.code, { syncStatus: "error", syncError: String(e.message || e).slice(0, 300), syncAt: now });
  }
}
