import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ZONES, EVENT, currentPrice } from "@/lib/config";
import { newCode, saveOrder, hasPaidDni, verifyAdvisor, listOrdersByAdvisor } from "@/lib/orders";
import { availability } from "@/lib/availability";
import { validateBuyer, limited, clientIp } from "@/lib/validate";

const base = () => process.env.BASE_URL || "http://localhost:3100";
const VOUCHER_DIR = path.join(process.cwd(), "data", "vouchers");
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
  paymentMethod: o.paymentMethod, hasVoucher: !!o.voucherFile, createdAt: o.createdAt, acceptedAt: o.acceptedAt,
  acceptUrl: o.acceptToken ? `${base()}/aceptar/${o.acceptToken}` : null,
});

// Crea una venta manual: queda "esperando T&C" hasta que el propio cliente los acepte.
export async function POST(req) {
  // JSON (listar) o multipart (registrar venta con foto del voucher)
  let b = null, file = null;
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (fd) { b = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")); b.pagoRecibido = b.pagoRecibido === "true"; file = fd.get("voucher"); }
  } else b = await req.json().catch(() => null);
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

  // Comprobante: obligatorio salvo efectivo. Solo imagen o PDF, hasta 5 MB, verificado por su firma binaria.
  let voucherFile = null, voucherToken = null;
  const hasFile = file && typeof file === "object" && file.size > 0;
  if (!hasFile && metodo !== "efectivo") return NextResponse.json({ error: "Adjunta la foto del voucher o comprobante de pago." }, { status: 400 });
  if (hasFile) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El comprobante pesa más de 5 MB." }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? "jpg"
      : buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? "png"
      : buf.subarray(0, 4).toString() === "%PDF" ? "pdf"
      : buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "webp" : null;
    if (!ext) return NextResponse.json({ error: "El comprobante debe ser una foto (JPG, PNG, WEBP) o un PDF." }, { status: 400 });
    voucherToken = crypto.randomBytes(18).toString("base64url");
    voucherFile = `${voucherToken}.${ext}`;
    fs.mkdirSync(VOUCHER_DIR, { recursive: true });
    fs.writeFileSync(path.join(VOUCHER_DIR, voucherFile), buf);
  }

  let order;
  try {
  order = saveOrder({
    code: newCode(), zone: zone.id, price: currentPrice(zone), currency: "PEN", ...v.value,
    termsVersion: EVENT.termsVersion, acceptedAt: "", status: "awaiting_terms", createdAt: new Date().toISOString(),
    advisorCode: adv.code, advisorName: adv.name, paymentMethod: metodo, manualRef,
    acceptToken: crypto.randomBytes(18).toString("base64url"), voucherFile, voucherToken,
  });
  } catch (e) {
    if (voucherFile) try { fs.unlinkSync(path.join(VOUCHER_DIR, voucherFile)); } catch {}
    return NextResponse.json({ error: "No se pudo registrar la venta." }, { status: 500 });
  }
  return NextResponse.json({ order: view(order) });
}
