import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { advisorAuth } from "@/lib/advisor-auth";
import { getOrder, updateOrder, verifyAdvisor, opNumberUsed, addAbono, paidSoFar, listAbonos } from "@/lib/orders";
import { syncAbonosOfOrder } from "@/lib/django";
import { limited, clientIp, tooLarge, accountLocked, registerFail, clearFails } from "@/lib/validate";

const VOUCHER_DIR = path.join(process.cwd(), "data", "vouchers");
const METODOS = ["yape", "plin", "transferencia", "efectivo", "deposito"];


// Registra un abono (pago siguiente) de una entrada separada. Al completar el total, Django confirma y envía la entrada.
export async function POST(req) {
  const { adv, res } = advisorAuth(req);
  if (res) return res;
  const big = tooLarge(req, 6 * 1024 * 1024);
  if (big) return big;
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const b = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
  const file = fd.get("voucher");

  const order = getOrder(String(b.code || ""));
  if (!order || order.advisorCode !== adv.code) return NextResponse.json({ error: "Esa venta no existe o no es tuya." }, { status: 404 });
  if (order.saleKind !== "separacion") return NextResponse.json({ error: "Esa venta no es una separación." }, { status: 400 });
  if (order.status === "awaiting_terms") return NextResponse.json({ error: "El cliente aún no acepta los Términos: envíale primero su link." }, { status: 409 });
  if (order.status !== "separated") return NextResponse.json({ error: order.status === "paid" ? "Esa entrada ya está pagada por completo." : "Esa venta no admite abonos." }, { status: 409 });

  const saldo = Math.round((order.price - paidSoFar(order.code)) * 100) / 100;
  const amount = Number(String(b.montoPagado || "").replace(",", "."));
  const metodo = String(b.metodoPago || "").toLowerCase();
  const op = String(b.referencia || "").trim().slice(0, 60);
  const payDate = String(b.fechaPago || "").trim();
  const bank = String(b.banco || "").trim().slice(0, 60);
  if (b.pagoRecibido !== "true") return NextResponse.json({ error: "Confirma que ya recibiste el pago." }, { status: 400 });
  if (!METODOS.includes(metodo)) return NextResponse.json({ error: "Elige cómo pagó el cliente." }, { status: 400 });
  if (!(amount > 0) || amount > saldo) return NextResponse.json({ error: `El abono debe ser mayor a 0 y como máximo el saldo (S/ ${saldo}).` }, { status: 400 });
  if (metodo !== "efectivo" && !/^[A-Za-z0-9\-_/ ]{4,40}$/.test(op)) return NextResponse.json({ error: "Escribe el n.º de operación del voucher." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate) || isNaN(Date.parse(payDate))) return NextResponse.json({ error: "Indica la fecha del pago." }, { status: 400 });

  let fileBuf = null, ext = null;
  const hasFile = file && typeof file === "object" && file.size > 0;
  if (!hasFile && metodo !== "efectivo") return NextResponse.json({ error: "Adjunta la foto del voucher." }, { status: 400 });
  if (hasFile) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El comprobante pesa más de 5 MB." }, { status: 400 });
    fileBuf = Buffer.from(await file.arrayBuffer());
    ext = fileBuf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? "jpg"
      : fileBuf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? "png"
      : fileBuf.subarray(0, 4).toString() === "%PDF" ? "pdf"
      : fileBuf.subarray(0, 4).toString() === "RIFF" && fileBuf.subarray(8, 12).toString() === "WEBP" ? "webp" : null;
    if (!ext) return NextResponse.json({ error: "El comprobante debe ser una foto (JPG, PNG, WEBP) o un PDF." }, { status: 400 });
  }
  if (op && opNumberUsed(metodo, op)) return NextResponse.json({ error: "Ese n.º de operación ya fue registrado." }, { status: 409 });

  let voucherFile = null, voucherToken = null;
  if (fileBuf) {
    voucherToken = crypto.randomBytes(18).toString("base64url");
    voucherFile = `${voucherToken}.${ext}`;
    fs.mkdirSync(VOUCHER_DIR, { recursive: true });
    fs.writeFileSync(path.join(VOUCHER_DIR, voucherFile), fileBuf);
  }
  addAbono({ orderCode: order.code, amount, method: metodo, op, payDate, bank, voucherFile, voucherToken, createdBy: adv.name });
  await syncAbonosOfOrder(order.code); // al completar el total, Django confirma y envía la entrada
  const pagado = paidSoFar(order.code);
  // Completo aunque el sistema de entradas esté caído: el pago queda registrado aquí y se reenvía solo
  if (pagado >= order.price && getOrder(order.code).status === "separated") updateOrder(order.code, { status: "paid", paidAt: new Date().toISOString() });
  const after = getOrder(order.code);
  return NextResponse.json({
    ok: true, status: after.status, pagado, saldo: Math.max(0, order.price - pagado),
    pagos: listAbonos(order.code).map((a) => ({ n: a.n, amount: a.amount, method: a.method, op: a.op, payDate: a.payDate, sync: a.syncStatus })),
  });
}
