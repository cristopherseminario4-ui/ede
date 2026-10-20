import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listComplaints, getComplaint, answerComplaint } from "@/lib/orders";
import { sendPlainMail } from "@/lib/mail";
import { EVENT } from "@/lib/config";

export const dynamic = "force-dynamic";

// Fecha límite: 15 días hábiles (lunes a viernes; los feriados no se descuentan: revisar con administración)
function deadline(iso) {
  const d = new Date(iso);
  let n = 0;
  while (n < 15) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }
  return d.toISOString().slice(0, 10);
}

export async function GET(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ complaints: listComplaints().map((c) => ({ ...c, venceEl: deadline(c.createdAt) })) });
}

// POST { id, respuesta }: registra la respuesta y la envía al correo del consumidor
export async function POST(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  const c = getComplaint(b.id);
  if (!c) return NextResponse.json({ error: "Reclamo no existe" }, { status: 404 });
  if (c.status === "atendido") return NextResponse.json({ error: "Este reclamo ya fue respondido." }, { status: 409 });
  const respuesta = String(b.respuesta || "").trim();
  if (respuesta.length < 10) return NextResponse.json({ error: "Escribe la respuesta al consumidor." }, { status: 400 });
  const upd = answerComplaint(c.id, respuesta);
  const mail = await sendPlainMail({
    to: c.correo, subject: `Respuesta a tu ${c.tipo} ${c.numero} · ${EVENT.short}`,
    text: `Hola ${c.nombre},\n\nRespuesta a tu ${c.tipo} ${c.numero}:\n\n${respuesta}\n\nEL DESPERTAR DEL EMPRENDEDOR S.A.C. · RUC ${EVENT.ruc}\n${EVENT.email}`,
  });
  return NextResponse.json({ complaint: upd, correoEnviado: mail.ok });
}
