// Validación común, límites de tasa y utilidades de seguridad (checkout web, asesor, reclamos, paneles)
import crypto from "node:crypto";
import { NextResponse } from "next/server";

// Correo estricto: un solo destinatario, sin comas, punto y coma ni caracteres de cabecera (evita envíos masivos por SMTP)
export const EMAIL_RE = /^[^\s@,;<>"'()[\]\\]+@[^\s@,;<>"'()[\]\\]+\.[A-Za-z]{2,}$/;
export const validEmail = (s) => typeof s === "string" && s.length <= 160 && EMAIL_RE.test(s);

export function validateBuyer(b) {
  const nombre = String(b.nombre || "").trim();
  const dni = String(b.dni || "").replace(/\s+/g, "").toUpperCase();
  const telefono = String(b.telefono || "").replace(/[\s-]/g, "").replace(/^(\+?51)(?=9\d{8}$)/, "");
  const correo = String(b.correo || "").trim();
  const comprobante = b.comprobante === "factura" ? "factura" : "boleta";
  const ruc = String(b.ruc || "").trim();
  const razonSocial = String(b.razonSocial || "").trim();

  if (nombre.length < 3 || nombre.length > 120 || /[<>]/.test(nombre)) return { error: "Escribe el nombre completo." };
  if (!/^[A-Za-z0-9]{8,12}$/.test(dni)) return { error: "DNI o documento inválido." };
  if (!/^9\d{8}$/.test(telefono)) return { error: "Escribe un celular peruano de 9 dígitos (con WhatsApp)." };
  if (!validEmail(correo)) return { error: "Correo inválido." };
  if (comprobante === "factura" && (!/^\d{11}$/.test(ruc) || razonSocial.length < 3 || razonSocial.length > 160))
    return { error: "Para factura indica RUC (11 dígitos) y razón social." };

  return {
    value: {
      nombre, dni, telefono, correo, comprobante,
      ruc: comprobante === "factura" ? ruc : null,
      razonSocial: comprobante === "factura" ? razonSocial : null,
    },
  };
}

// Límite por clave (en memoria, por instancia): `max` intentos por ventana. Limpia claves viejas para no crecer sin fin.
const hits = globalThis.__edeLimits || (globalThis.__edeLimits = new Map());
export function limited(key, max = 8, windowMs = 60_000) {
  const now = Date.now();
  if (hits.size > 20_000) for (const [k, v] of hits) if (now - v[v.length - 1] > 15 * 60_000) hits.delete(k);
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

// Bloqueo por cuenta tras fallos repetidos (independiente de la IP): 10 fallos en 15 min → 15 min bloqueada
const fails = globalThis.__edeFails || (globalThis.__edeFails = new Map());
export const accountLocked = (key) => (fails.get(key) || []).filter((t) => Date.now() - t < 15 * 60_000).length >= 10;
export const registerFail = (key) => fails.set(key, [...(fails.get(key) || []).filter((t) => Date.now() - t < 15 * 60_000), Date.now()]);
export const clearFails = (key) => fails.delete(key);

// IP del cliente. En producción define TRUSTED_IP_HEADER con la cabecera que fija tu proveedor
// (cf-connecting-ip en Cloudflare, x-vercel-forwarded-for en Vercel, x-real-ip con Nginx). Si no, la última de x-forwarded-for.
export function clientIp(req) {
  const h = process.env.TRUSTED_IP_HEADER;
  const raw = (h && req.headers.get(h)) || req.headers.get("x-forwarded-for")?.split(",").pop() || "";
  const ip = raw.trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : "sin-ip";
}

// Tope de tamaño del cuerpo ANTES de leerlo (evita agotar memoria con cuerpos gigantes)
export function tooLarge(req, maxBytes) {
  const len = Number(req.headers.get("content-length") || 0);
  if (!len || len > maxBytes) return NextResponse.json({ error: "Solicitud demasiado grande o vacía." }, { status: 413 });
  return null;
}

// Fecha en hora de Lima (UTC-5, sin horario de verano) para comprobantes, reportes y reclamos
export const limaDate = (iso = new Date().toISOString()) => new Date(Date.parse(iso) - 5 * 3600 * 1000).toISOString().slice(0, 10);

// Firma corta para links de asesor (?a=codigo.firma): evita atribuir ventas a otro asesor
const linkSecret = () => process.env.SESSION_SECRET || (process.env.NODE_ENV === "development" ? "ede-local-session-secret" : "");
export const signAdvisor = (code) => `${code}.${crypto.createHmac("sha256", linkSecret()).update(`adv:${code}`).digest("base64url").slice(0, 10)}`;
export function verifyAdvisorRef(ref) {
  const [code, sig] = String(ref || "").toLowerCase().split(".");
  if (!code || !sig || !linkSecret()) return null;
  const good = signAdvisor(code).split(".")[1].toLowerCase();
  const a = Buffer.from(good), b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? code : null;
}

// Celda de CSV segura (sin fórmulas al abrir en Excel) sin estropear teléfonos +51…
export function csvCell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=\-@\t\r]/.test(s) || (/^\+/.test(s) && !/^\+[\d ]+$/.test(s))) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
