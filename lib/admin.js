import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { limited, clientIp } from "@/lib/validate";
import { readCookie, readSession, makeSession, cookieOpts } from "@/lib/session";

export const ADMIN_COOKIE = "ede_adm";
const ADMIN_HOURS = 8;

// Clave del panel. Siempre desde ADMIN_PASSWORD (mín. 24 caracteres); el valor por defecto solo existe en `next dev`.
export function adminKey() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD.length >= 24 || process.env.NODE_ENV === "development" ? process.env.ADMIN_PASSWORD : null;
  return process.env.NODE_ENV === "development" ? "ede-local-admin" : null;
}
const digest = (s) => crypto.createHash("sha256").update(String(s)).digest();
export const keyMatches = (given) => { const key = adminKey(); return !!key && crypto.timingSafeEqual(digest(given || ""), digest(key)); };

// Acepta la sesión del panel (cookie) o la cabecera x-admin-key (para scripts)
export function requireAdmin(req) {
  if (limited(`adm:${clientIp(req)}`, 60)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  const key = adminKey();
  if (!key) return NextResponse.json({ error: "Panel deshabilitado: falta ADMIN_PASSWORD (mín. 24 caracteres)" }, { status: 503 });
  if (readSession(readCookie(req, ADMIN_COOKIE), "adm", () => key)) return null;
  const header = req.headers.get("x-admin-key");
  if (header && keyMatches(header)) return null;
  if (header) limited(`adm-fail:${clientIp(req)}`, 5);
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function adminSessionCookie() {
  const v = makeSession("adm", "admin", adminKey(), ADMIN_HOURS);
  return v ? { name: ADMIN_COOKIE, value: v, options: cookieOpts(ADMIN_HOURS) } : null;
}
