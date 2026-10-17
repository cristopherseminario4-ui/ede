import crypto from "node:crypto";
import { NextResponse } from "next/server";

// Clave del panel. En producción DEBE venir de ADMIN_PASSWORD; en local hay un valor por defecto.
function adminKey() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : "ede-local-admin";
}

export function requireAdmin(req) {
  const key = adminKey();
  if (!key) return NextResponse.json({ error: "Panel deshabilitado: falta ADMIN_PASSWORD" }, { status: 503 });
  const a = Buffer.from(req.headers.get("x-admin-key") || ""), b = Buffer.from(key);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return null;
}
