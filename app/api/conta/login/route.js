import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/orders";
import { sessionCookie } from "@/lib/staff";
import { limited, clientIp, tooLarge, accountLocked, registerFail, clearFails } from "@/lib/validate";

export async function POST(req) {
  const big = tooLarge(req, 4_000);
  if (big) return big;
  const b = await req.json().catch(() => ({}));
  const user = String(b.username || "").trim().toLowerCase().slice(0, 30); // misma normalización que la verificación
  if (limited(`staff:${clientIp(req)}`, 10) || accountLocked(`staff:${user}`))
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  const u = verifyStaff(user, b.password);
  if (!u) { registerFail(`staff:${user}`); return NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 }); }
  clearFails(`staff:${user}`);
  const c = sessionCookie(u.username, u.session_version || 0);
  if (!c) return NextResponse.json({ error: "Sesiones no disponibles: falta SESSION_SECRET (mín. 32 caracteres) en el servidor." }, { status: 503 });
  const res = NextResponse.json({ user: { name: u.name, username: u.username } });
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
