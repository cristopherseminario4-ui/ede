import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/orders";
import { sessionCookie } from "@/lib/staff";
import { limited, clientIp } from "@/lib/validate";

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (limited(`staff:${clientIp(req)}:${String(b.username || "").toLowerCase()}`, 8))
    return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  const u = verifyStaff(b.username, b.password);
  if (!u) return NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 });
  const c = sessionCookie(u.username);
  if (!c) return NextResponse.json({ error: "Sesiones no disponibles: falta SESSION_SECRET en el servidor." }, { status: 503 });
  const res = NextResponse.json({ user: { name: u.name, username: u.username } });
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
