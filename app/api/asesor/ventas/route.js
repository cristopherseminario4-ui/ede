import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ZONES, EVENT, currentPrice } from "@/lib/config";
import { newCode, saveOrder, hasPaidDni, verifyAdvisor, listOrdersByAdvisor } from "@/lib/orders";
import { availability } from "@/lib/availability";
import { validateBuyer, limited, clientIp } from "@/lib/validate";

const base = () => process.env.BASE_URL || "http://localhost:3100";
const METODOS = ["yape", "plin", "transferencia", "efectivo", "deposito"];

// Inicio de sesión + operación del asesor (código y PIN en el cuerpo; nunca en la URL)
function auth(req, b) {
  if (limited(`adv:${clientIp(req)}:${String(b.code || "").toLowerCase()}`, 10))
    return { res: NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 }) };
  const adv = verifyAdvisor(b.code, b.pin);
  if (!adv) return { res: NextResponse.json({ error: "Código o PIN incorrecto." }, { status: 401 }) };
  return { adv };
}

const view = (o) => ({
  code: o.code, zone: o.zone, nombre: o.nombre, telefono: o.telefono, price: o.price, status: o.status,
  paymentMethod: o.paymentMethod, createdAt: o.createdAt, acceptedAt: o.acceptedAt,
  acceptUrl: o.acceptToken ? `${base()}/aceptar/${o.acceptToken}` : null,
});

// Crea una venta manual: queda "esperando T&C" hasta que el propio cliente los acepte.
export async function POST(req) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const { adv, res } = auth(req, b);
  if (res) return res;

  if (b.list === true) return NextResponse.json({ advisor: adv, orders: listOrdersByAdvisor(adv.code).map(view) });

  const zone = ZONES.find((z) => z.id === b.zone);
  if (!zone) return NextResponse.json({ error: "Zona inválida." }, { status: 400 });
  const v = validateBuyer(b);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
  const metodo = String(b.metodoPago || "").toLowerCase();
  if (!METODOS.includes(metodo)) return NextResponse.json({ error: "Elige cómo pagó el cliente." }, { status: 400 });
  if (b.pagoRecibido !== true) return NextResponse.json({ error: "Confirma que ya recibiste el pago." }, { status: 400 });
  const manualRef = String(b.referencia || "").trim().slice(0, 120);

  if (availability()[zone.id].left <= 0) return NextResponse.json({ error: `La Zona ${zone.name} está agotada.` }, { status: 409 });
  if (hasPaidDni(zone.id, v.value.dni)) return NextResponse.json({ error: "Este documento ya tiene una entrada en esta zona." }, { status: 409 });

  const order = saveOrder({
    code: newCode(), zone: zone.id, price: currentPrice(zone), currency: "PEN", ...v.value,
    termsVersion: EVENT.termsVersion, acceptedAt: "", status: "awaiting_terms", createdAt: new Date().toISOString(),
    advisorCode: adv.code, advisorName: adv.name, paymentMethod: metodo, manualRef,
    acceptToken: crypto.randomBytes(18).toString("base64url"),
  });
  return NextResponse.json({ order: view(order) });
}
