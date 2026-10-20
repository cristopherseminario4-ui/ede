// Sesión de los usuarios internos (contabilidad): cookie firmada, httpOnly, SameSite=Strict.
// La cookie lleva la versión de sesión del usuario: cerrar sesión o cambiar la clave invalida todas sus cookies.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStaff } from "@/lib/orders";

const COOKIE = "ede_staff";
const TTL_H = 10;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s.length >= 32 || process.env.NODE_ENV === "development" ? s : null;
  return process.env.NODE_ENV === "development" ? "ede-local-session-secret" : null; // sin secreto no hay sesiones fuera de `next dev`
}
const sign = (v, s) => crypto.createHmac("sha256", s).update(v).digest("base64url");

export function sessionCookie(username, version = 0) {
  const s = secret();
  if (!s) return null;
  const v = `${username}.${version}.${Date.now() + TTL_H * 3600 * 1000}`;
  return { name: COOKIE, value: `${v}.${sign(v, s)}`, options: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_H * 3600 } };
}
export const clearCookie = { name: COOKIE, value: "", options: { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 } };

export async function currentStaff() {
  const s = secret();
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!s || !raw) return null;
  const i = raw.lastIndexOf(".");
  const v = raw.slice(0, i), mac = raw.slice(i + 1);
  const a = Buffer.from(sign(v, s)), b = Buffer.from(mac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const parts = v.split(".");
  const exp = Number(parts.pop()), version = Number(parts.pop()), user = parts.join(".");
  if (!exp || exp < Date.now()) return null;
  const u = getStaff(user);
  return u && Number(u.session_version || 0) === version ? u : null;
}

export async function requireStaff() {
  const u = await currentStaff();
  return u ? { user: u } : { res: NextResponse.json({ error: "Inicia sesión." }, { status: 401 }) };
}
