import { NextResponse } from "next/server";
import { keyMatches, adminSessionCookie, adminKey, ADMIN_COOKIE } from "@/lib/admin";
import { limited, clientIp, tooLarge } from "@/lib/validate";

// POST { key } inicia sesión del panel (cookie de 8 h) · DELETE cierra la sesión
export async function POST(req) {
  const big = tooLarge(req, 2_000);
  if (big) return big;
  if (limited(`adm-login:${clientIp(req)}`, 5)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  if (!adminKey()) return NextResponse.json({ error: "Panel deshabilitado: falta ADMIN_PASSWORD (mín. 24 caracteres)" }, { status: 503 });
  const { key } = await req.json().catch(() => ({}));
  if (!keyMatches(key)) return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
  const c = adminSessionCookie();
  if (!c) return NextResponse.json({ error: "Falta SESSION_SECRET en el servidor." }, { status: 503 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(c.name, c.value, c.options);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
