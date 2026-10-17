import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff";
import { getOrder, updateOrder } from "@/lib/orders";
import { sendComprobanteMail } from "@/lib/mail";

const DIR = path.join(process.cwd(), "data", "comprobantes");

// Contabilidad registra la boleta/factura emitida (serie-número, fecha y PDF) y la envía al correo del cliente.
export async function POST(req) {
  const { user, res } = await requireStaff();
  if (res) return res;
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  const order = getOrder(String(fd.get("code") || ""));
  if (!order || !["paid", "in_review"].includes(order.status)) return NextResponse.json({ error: "Esa venta no está lista para comprobante." }, { status: 400 });

  const docNumber = String(fd.get("docNumber") || "").trim().toUpperCase();
  const docDate = String(fd.get("docDate") || "").trim();
  if (!/^[A-Z0-9]{2,6}-\d{1,10}$/.test(docNumber)) return NextResponse.json({ error: "Escribe la serie y el número, por ejemplo EB01-123." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(docDate) || isNaN(Date.parse(docDate))) return NextResponse.json({ error: "Indica la fecha de emisión." }, { status: 400 });

  const file = fd.get("pdf");
  let docFile = order.docFile, docToken = order.docToken || crypto.randomBytes(18).toString("base64url");
  if (file && typeof file === "object" && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El archivo pesa más de 5 MB." }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.subarray(0, 4).toString() !== "%PDF") return NextResponse.json({ error: "El comprobante debe ser un PDF." }, { status: 400 });
    docFile = `${docToken}.pdf`;
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, docFile), buf);
  }
  if (!docFile) return NextResponse.json({ error: "Sube el PDF de la boleta o factura." }, { status: 400 });

  const saved = updateOrder(order.code, { docNumber, docDate, docFile, docToken, docBy: user.name, docAt: new Date().toISOString(), docMailError: null });
  const sent = fd.get("enviar") === "false" ? null : await sendComprobanteMail(saved);
  const final = sent
    ? updateOrder(order.code, sent.ok ? { docSentAt: new Date().toISOString(), docMailError: null } : { docMailError: sent.error })
    : saved;
  return NextResponse.json({ ok: true, enviado: sent?.ok ?? false, errorCorreo: sent && !sent.ok ? sent.error : null, docNumber: final.docNumber });
}
