// Correo desde la plataforma (SMTP). Si no hay SMTP configurado, devuelve un error claro y no rompe nada.
import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { EVENT, ZONES } from "@/lib/config";

const oneRcpt = (to) => typeof to === "string" && !/[,;\s<>]/.test(to) && /@/.test(to);
export const mailEnabled = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const esc = (s) => String(s).replace(/[<>&"]/g, "");

export async function sendComprobanteMail(order) {
  if (!mailEnabled()) return { ok: false, error: "Correo no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS)" };
  if (!oneRcpt(order.correo)) return { ok: false, error: "Correo del cliente inválido" };
  const base = (process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
  const zone = ZONES.find((z) => z.id === order.zone);
  const link = `${base}/c/${order.docToken}`;
  const attachments = [];
  if (order.docFile) {
    try {
      attachments.push({
        filename: `Comprobante-${order.docNumber.replace(/[^A-Za-z0-9-]/g, "")}.${order.docFile.split(".").pop()}`,
        content: fs.readFileSync(path.join(process.cwd(), "data", "comprobantes", order.docFile)),
      });
    } catch {}
  }
  try {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({
      from: process.env.MAIL_FROM || `"${EVENT.short}" <${process.env.SMTP_USER}>`,
      to: order.correo, replyTo: EVENT.email,
      subject: `Tu comprobante ${order.docNumber} · ${EVENT.name}`,
      text: `Hola ${order.nombre},\n\nAdjuntamos tu comprobante ${order.docNumber} por tu entrada Zona ${zone?.name} (S/ ${order.price}).\nTambién puedes descargarlo aquí: ${link}\n\nEl Despertar del Emprendedor S.A.C. · RUC ${EVENT.ruc}\n${EVENT.email}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
        <h2 style="margin:0 0 12px">Tu comprobante de pago</h2>
        <p>Hola ${esc(order.nombre)},</p>
        <p>Adjuntamos tu comprobante <b>${esc(order.docNumber)}</b> por tu entrada <b>Zona ${zone?.name}</b> (S/ ${order.price}) de ${EVENT.name}.</p>
        <p><a href="${link}" style="background:#7b1fa2;color:#fff;padding:12px 20px;text-decoration:none;display:inline-block">Descargar comprobante</a></p>
        <p style="color:#666;font-size:12px">EL DESPERTAR DEL EMPRENDEDOR S.A.C. · RUC ${EVENT.ruc} · ${EVENT.email}</p></div>`,
      attachments,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 300) };
  }
}

// Envío genérico (reclamos, respuestas). Devuelve { ok, error }.
export async function sendPlainMail({ to, subject, text, cc }) {
  if (!mailEnabled()) return { ok: false, error: "Correo no configurado" };
  if (!oneRcpt(to) || (cc && !oneRcpt(cc))) return { ok: false, error: "Destinatario inválido" };
  try {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({ from: process.env.MAIL_FROM || `"${EVENT.short}" <${process.env.SMTP_USER}>`, to, cc, replyTo: EVENT.email, subject, text });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 300) }; }
}
