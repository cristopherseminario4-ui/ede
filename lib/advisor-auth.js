// Autenticación del asesor: sesión en cookie (no se pierde al recargar) o cabeceras x-adv-code / x-adv-pin.
import { NextResponse } from "next/server";
import { verifyAdvisor, advisorPinBinding } from "@/lib/orders";
import { limited, clientIp, accountLocked, registerFail, clearFails } from "@/lib/validate";
import { readCookie, readSession, makeSession, cookieOpts } from "@/lib/session";

export const ADV_COOKIE = "ede_adv";
const ADV_HOURS = 12;

export function advisorAuth(req) {
  if (limited(`adv:${clientIp(req)}`, 60)) return { res: NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 }) };
  const ses = readSession(readCookie(req, ADV_COOKIE), "adv", (who) => advisorPinBinding(who)?.bind);
  if (ses) { const a = advisorPinBinding(ses.who); return { adv: { code: a.code, name: a.name } }; }
  const code = String(req.headers.get("x-adv-code") || "").trim().toLowerCase().slice(0, 30);
  const pin = String(req.headers.get("x-adv-pin") || "").slice(0, 12);
  if (!code) return { res: NextResponse.json({ error: "Inicia sesión." }, { status: 401 }) };
  return loginAdvisor(req, code, pin);
}

export function loginAdvisor(req, code, pin) {
  code = String(code || "").trim().toLowerCase().slice(0, 30);
  if (limited(`adv-login:${clientIp(req)}`, 20) || accountLocked(`adv:${code}`))
    return { res: NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 }) };
  const adv = verifyAdvisor(code, String(pin || "").slice(0, 12));
  if (!adv) { registerFail(`adv:${code}`); return { res: NextResponse.json({ error: "Código o PIN incorrecto." }, { status: 401 }) }; }
  clearFails(`adv:${code}`);
  return { adv };
}

export function advisorSessionCookie(code) {
  const b = advisorPinBinding(code);
  const v = b && makeSession("adv", b.code, b.bind, ADV_HOURS);
  return v ? { name: ADV_COOKIE, value: v, options: cookieOpts(ADV_HOURS) } : null;
}
