import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { limited, clientIp } from "@/lib/validate";

// Clave del panel. Siempre desde ADMIN_PASSWORD (mín. 24 caracteres); el valor por defecto solo existe en `next dev`.
function adminKey() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD.length >= 24 || process.env.NODE_ENV === "development" ? process.env.ADMIN_PASSWORD : null;
  return process.env.NODE_ENV === "development" ? "ede-local-admin" : null;
}
const digest = (s) => crypto.createHash("sha256").update(String(s)).digest();

export function requireAdmin(req) {
  if (limited(`adm:${clientIp(req)}`, 30)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  const key = adminKey();
  if (!key) return NextResponse.json({ error: "Panel deshabilitado: falta ADMIN_PASSWORD (mín. 24 caracteres)" }, { status: 503 });
  // Se comparan resúmenes de igual largo: no filtra la longitud de la clave
  if (!crypto.timingSafeEqual(digest(req.headers.get("x-admin-key") || ""), digest(key))) {
    limited(`adm-fail:${clientIp(req)}`, 5); // los fallos cuentan aparte y más estricto
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
