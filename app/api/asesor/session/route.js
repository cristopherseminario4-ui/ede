import { NextResponse } from "next/server";
import { loginAdvisor, advisorSessionCookie, ADV_COOKIE } from "@/lib/advisor-auth";
import { tooLarge } from "@/lib/validate";

// POST { code, pin } inicia la sesión del asesor (cookie de 12 h) · DELETE la cierra
export async function POST(req) {
  const big = tooLarge(req, 2_000);
  if (big) return big;
  const b = await req.json().catch(() => ({}));
  const { adv, res } = loginAdvisor(req, b.code, b.pin);
  if (res) return res;
  const c = advisorSessionCookie(adv.code);
  if (!c) return NextResponse.json({ error: "Falta SESSION_SECRET en el servidor." }, { status: 503 });
  const out = NextResponse.json({ ok: true, advisor: adv });
  out.cookies.set(c.name, c.value, c.options);
  return out;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADV_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
