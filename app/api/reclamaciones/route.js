import { NextResponse } from "next/server";
import { createComplaint } from "@/lib/orders";
import { sendPlainMail } from "@/lib/mail";
import { EVENT } from "@/lib/config";
import { limited, clientIp, tooLarge, validEmail, limaDate } from "@/lib/validate";

const t = (v, max) => String(v || "").trim().slice(0, max);

// Libro de Reclamaciones virtual. Guarda el reclamo, entrega un número correlativo y envía copia al consumidor.
export async function POST(req) {
  if (process.env.PREVIEW_MODE === "1")
    return NextResponse.json({ error: "Vista previa de diseño: el Libro de Reclamaciones se activará al publicar la web oficial." }, { status: 503 });
  const big = tooLarge(req, 20_000);
  if (big) return big;
  if (limited(`rec:${clientIp(req)}`, 4)) return NextResponse.json({ error: "Demasiados envíos. Espera un minuto." }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  if (b.website) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); // campo trampa para bots
  const c = {
    tipo: b.tipo === "queja" ? "queja" : "reclamo",
    nombre: t(b.nombre, 120), docTipo: ["DNI", "CE", "PASAPORTE", "RUC"].includes(b.docTipo) ? b.docTipo : "DNI", docNum: t(b.docNum, 20),
    domicilio: t(b.domicilio, 200), telefono: t(b.telefono, 20), correo: t(b.correo, 160),
    menor: b.menor === true, tutor: t(b.tutor, 160),
    bien: b.bien === "producto" ? "producto" : "servicio", monto: b.monto === "" || b.monto == null ? null : Number(b.monto),
    descBien: t(b.descBien, 300), detalle: t(b.detalle, 2000), pedido: t(b.pedido, 1000), ip: clientIp(req),
  };
  if (c.nombre.length < 3) return NextResponse.json({ error: "Escribe tu nombre completo." }, { status: 400 });
  if (!/^[A-Za-z0-9]{6,20}$/.test(c.docNum)) return NextResponse.json({ error: "Documento de identidad inválido." }, { status: 400 });
  if (c.domicilio.length < 5) return NextResponse.json({ error: "Indica tu domicilio." }, { status: 400 });
  if (!/^\+?[0-9 ]{7,15}$/.test(c.telefono)) return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });
  if (!validEmail(c.correo)) return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
  if (c.menor && c.tutor.length < 3) return NextResponse.json({ error: "Indica el nombre del padre, madre o representante." }, { status: 400 });
  if (c.monto != null && !(c.monto >= 0)) return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
  if (c.descBien.length < 3) return NextResponse.json({ error: "Describe el producto o servicio contratado." }, { status: 400 });
  if (c.detalle.length < 10) return NextResponse.json({ error: "Cuéntanos qué ocurrió." }, { status: 400 });
  if (c.pedido.length < 5) return NextResponse.json({ error: "Indica qué solicitas como solución." }, { status: 400 });
  if (b.acepta !== true) return NextResponse.json({ error: "Debes confirmar los datos para enviar." }, { status: 400 });

  const rec = createComplaint(c);
  const copia = `HOJA DE RECLAMACIÓN ${rec.numero}\nFecha: ${limaDate(rec.createdAt)}\n\nProveedor: EL DESPERTAR DEL EMPRENDEDOR S.A.C. · RUC ${EVENT.ruc}\n\nConsumidor: ${rec.nombre} (${rec.docTipo} ${rec.docNum})\nTipo: ${rec.tipo.toUpperCase()}\nBien contratado: ${rec.bien} · ${rec.descBien}${rec.monto != null ? ` · S/ ${rec.monto}` : ""}\n\nDetalle:\n${rec.detalle}\n\nPedido del consumidor:\n${rec.pedido}\n\nRespuesta: en un plazo máximo de 15 días hábiles, al correo que registraste.\nLa formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante INDECOPI.`;
  const mail = await sendPlainMail({ to: rec.correo, cc: EVENT.email, subject: `Hoja de Reclamación ${rec.numero} · ${EVENT.short}`, text: copia });
  return NextResponse.json({ ok: true, numero: rec.numero, correoEnviado: mail.ok });
}
