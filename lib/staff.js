// Sesión de los usuarios internos (contabilidad): cookie firmada, httpOnly, SameSite=Strict.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStaff } from "@/lib/orders";

const COOKIE = "ede_staff";
const TTL_H = 10;

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") return null; // sin secreto no hay sesiones en producción
  return "ede-local-session-secret";
}
const sign = (v, s) => crypto.createHmac("sha256", s).update(v).digest("base64url");

export function sessionCookie(username) {
  const s = secret();
  if (!s) return null;
  const v = `${username}.${Date.now() + TTL_H * 3600 * 1000}`;
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
  const j = v.lastIndexOf(".");
  const user = v.slice(0, j), exp = Number(v.slice(j + 1));
  if (!exp || exp < Date.now()) return null;
  return getStaff(user);
}

export async function requireStaff() {
  const u = await currentStaff();
  return u ? { user: u } : { res: NextResponse.json({ error: "Inicia sesión." }, { status: 401 }) };
}
