import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ZONES, EVENT, currentPrice } from "@/lib/config";
import { newCode, saveOrder, hasPaidDni, expireStale, verifyAdvisor, listOrdersByAdvisor, opNumberUsed, advisorSalesToday } from "@/lib/orders";
import { availability } from "@/lib/availability";
import { validateBuyer, limited, clientIp, tooLarge, accountLocked, registerFail, clearFails, signAdvisor } from "@/lib/validate";

const base = () => process.env.BASE_URL || "http://localhost:3100";
const VOUCHER_DIR = path.join(process.cwd(), "data", "vouchers");
const METODOS = ["yape", "plin", "transferencia", "efectivo", "deposito"];

const DAILY_MAX = Number(process.env.ADVISOR_DAILY_MAX || 40);

// Autenticación del asesor por cabeceras (x-adv-code / x-adv-pin), ANTES de leer el cuerpo. Nunca en la URL.
function auth(req) {
  const code = String(req.headers.get("x-adv-code") || "").trim().toLowerCase().slice(0, 30); // igual que la verificación
  const pin = String(req.headers.get("x-adv-pin") || "").slice(0, 12);
  if (limited(`adv:${clientIp(req)}`, 20) || accountLocked(`adv:${code}`))
    return { res: NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 }) };
  const adv = verifyAdvisor(code, pin);
  if (!adv) { registerFail(`adv:${code}`); return { res: NextResponse.json({ error: "Código o PIN incorrecto." }, { status: 401 }) }; }
  clearFails(`adv:${code}`);
  return { adv };
}

const view = (o) => ({
  code: o.code, zone: o.zone, nombre: o.nombre, telefono: o.telefono, price: o.price, status: o.status,
  paymentMethod: o.paymentMethod, opNumber: o.manualRef, hasVoucher: !!o.voucherFile, createdAt: o.createdAt, acceptedAt: o.acceptedAt,
  acceptUrl: o.acceptToken ? `${base()}/aceptar/${o.acceptToken}` : null,
});

// Crea una venta manual: queda "esperando T&C" hasta que el propio cliente los acepte.
export async function POST(req) {
  const { adv, res } = auth(req);
  if (res) return res;
  const multipart = (req.headers.get("content-type") || "").includes("multipart/form-data");
  const big = tooLarge(req, multipart ? 6 * 1024 * 1024 : 4_000);
  if (big) return big;
  // JSON (listar) o multipart (registrar venta con foto del voucher)
  let b = null, file = null;
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (fd) { b = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")); b.pagoRecibido = b.pagoRecibido === "true"; file = fd.get("voucher"); }
  } else b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  if (b.list === true) return NextResponse.json({ advisor: { ...adv, link: `${base()}/?a=${signAdvisor(adv.code)}` }, orders: listOrdersByAdvisor(adv.code).map(view) });
  if (advisorSalesToday(adv.code) >= DAILY_MAX)
    return NextResponse.json({ error: `Llegaste al tope de ${DAILY_MAX} ventas manuales en 24 h. Pide a administración que lo amplíe.` }, { status: 429 });

  expireStale();
  const zone = ZONES.find((z) => z.id === b.zone);
  if (!zone) return NextResponse.json({ error: "Zona inválida." }, { status: 400 });
  const v = validateBuyer(b);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
  const metodo = String(b.metodoPago || "").toLowerCase();
  if (!METODOS.includes(metodo)) return NextResponse.json({ error: "Elige cómo pagó el cliente." }, { status: 400 });
  if (b.pagoRecibido !== true) return NextResponse.json({ error: "Confirma que ya recibiste el pago." }, { status: 400 });
  // Datos de la operación (los necesita contabilidad para conciliar): n.º de operación, fecha, monto y entidad
  const manualRef = String(b.referencia || "").trim().slice(0, 60);
  const payBank = String(b.banco || "").trim().slice(0, 60);
  const payDate = String(b.fechaPago || "").trim();
  const payAmount = Number(String(b.montoPagado || "").replace(",", "."));
  if (metodo !== "efectivo" && !/^[A-Za-z0-9\-_/ ]{4,40}$/.test(manualRef))
    return NextResponse.json({ error: "Escribe el n.º de operación tal como sale en el voucher (4 a 40 caracteres)." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate) || isNaN(Date.parse(payDate)))
    return NextResponse.json({ error: "Indica la fecha en que pagó el cliente." }, { status: 400 });
  const days = (Date.now() - Date.parse(payDate)) / 86400000;
  if (days < -1 || days > 60) return NextResponse.json({ error: "La fecha de pago no es válida (no puede ser futura ni de hace más de 60 días)." }, { status: 400 });
  if (!(payAmount > 0)) return NextResponse.json({ error: "Indica el monto que pagó el cliente." }, { status: 400 });
  if (payAmount !== currentPrice(zone))
    return NextResponse.json({ error: `El monto debe ser S/ ${currentPrice(zone)} (precio de la zona). Si hay descuento, pide autorización a administración.` }, { status: 400 });


  // Comprobante: obligatorio salvo efectivo. Solo imagen o PDF, hasta 5 MB, verificado por su firma binaria.
  let voucherFile = null, voucherToken = null, fileBuf = null, fileExt = null;
  const hasFile = file && typeof file === "object" && file.size > 0;
  if (!hasFile && metodo !== "efectivo") return NextResponse.json({ error: "Adjunta la foto del voucher o comprobante de pago." }, { status: 400 });
  if (hasFile) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El comprobante pesa más de 5 MB." }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer()); // único await: después todo es síncrono hasta guardar
    const ext = buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? "jpg"
      : buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? "png"
      : buf.subarray(0, 4).toString() === "%PDF" ? "pdf"
      : buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "webp" : null;
    if (!ext) return NextResponse.json({ error: "El comprobante debe ser una foto (JPG, PNG, WEBP) o un PDF." }, { status: 400 });
    fileBuf = buf; fileExt = ext;
  }
  if (manualRef && opNumberUsed(metodo, manualRef))
    return NextResponse.json({ error: "Ese n.º de operación ya fue registrado en otra venta." }, { status: 409 });
  if (availability()[zone.id].left <= 0) return NextResponse.json({ error: `La Zona ${zone.name} está agotada.` }, { status: 409 });
  if (hasPaidDni(zone.id, v.value.dni)) return NextResponse.json({ error: "Este documento ya tiene una entrada en este evento." }, { status: 409 });
  if (fileBuf) {
    voucherToken = crypto.randomBytes(18).toString("base64url");
    voucherFile = `${voucherToken}.${fileExt}`;
    fs.mkdirSync(VOUCHER_DIR, { recursive: true });
    fs.writeFileSync(path.join(VOUCHER_DIR, voucherFile), fileBuf);
  }

  let order;
  try {
  order = saveOrder({
    code: newCode(), zone: zone.id, price: currentPrice(zone), currency: "PEN", ...v.value,
    termsVersion: EVENT.termsVersion, acceptedAt: "", status: "awaiting_terms", createdAt: new Date().toISOString(),
    advisorCode: adv.code, advisorName: adv.name, paymentMethod: metodo, manualRef, payDate, payAmount, payBank,
    acceptToken: crypto.randomBytes(18).toString("base64url"), voucherFile, voucherToken,
  });
  } catch (e) {
    if (voucherFile) try { fs.unlinkSync(path.join(VOUCHER_DIR, voucherFile)); } catch {}
    return NextResponse.json({ error: "No se pudo registrar la venta." }, { status: 500 });
  }
  return NextResponse.json({ order: view(order) });
}
