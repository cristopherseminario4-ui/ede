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

const inflight = globalThis.__edeSync || (globalThis.__edeSync = new Set());

export async function syncOrderToDjango(order) {
  if (inflight.has(order.code)) return order; // otra notificación ya lo está enviando
  inflight.add(order.code);
  try { return await doSync(order); } finally { inflight.delete(order.code); }
}

async function doSync(order) {
  const c = cfg();
  if (!c.url || !c.key) return updateOrder(order.code, { syncStatus: "skipped", syncError: "DJANGO_API_URL/DJANGO_API_KEY no configurados", syncAt: new Date().toISOString() });
  const zone = ZONES.find((z) => z.id === order.zone);
  const partes = order.nombre.trim().split(/\s+/);
  const nombres = partes.length > 2 ? partes.slice(0, Math.ceil(partes.length / 2)).join(" ") : partes[0];
  const apellidos = partes.slice(nombres.split(" ").length).join(" ");
  const via = order.advisorName ? `Asesor: ${order.advisorName}` : "";
  const tc = order.acceptedAt ? `T&C ${order.termsVersion} aceptados ${order.acceptedAt}${order.acceptedIp ? ` (IP ${order.acceptedIp})` : ""}` : "";
  const notas = [`Web EDE · pedido ${order.code}`, via, tc, order.manualRef ? `N.º operación: ${order.manualRef}` : "", order.payDate ? `Fecha pago: ${order.payDate}` : "", order.payAmount ? `Monto: S/ ${order.payAmount}` : "", order.payBank ? `Entidad: ${order.payBank}` : "", order.voucherDrive ? `Voucher en Drive: ${order.voucherDrive}` : "", `Comprobante: ${order.comprobante}`, order.ruc ? `RUC ${order.ruc} · ${order.razonSocial}` : "", order.mpPaymentId ? `MP #${order.mpPaymentId}` : ""]
    .filter(Boolean).join(" | ") + (process.env.MP_SANDBOX === "1" ? " | PRUEBA (pago de prueba, sin cobro): eliminar" : "");
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
    if (r.ok && j.ok) {
      // Django registró, pero si debía enviar la entrada y no pudo, queda visible para reenviarla desde el sistema
      const noEnviada = !manual && j.entrada_enviada === false;
      return updateOrder(order.code, { syncStatus: "ok", syncError: noEnviada ? "Registrado, pero la entrada no se envió: reenviar desde el sistema de entradas" : null, syncAt: now, djangoId: j.id ?? null });
    }
    return updateOrder(order.code, { syncStatus: "error", syncError: `${r.status} ${j.error || ""}`.trim().slice(0, 300), syncAt: now });
  } catch (e) {
    return updateOrder(order.code, { syncStatus: "error", syncError: String(e.message || e).slice(0, 300), syncAt: now });
  }
}
