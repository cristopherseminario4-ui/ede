// Sesiones firmadas en cookies httpOnly (administración y asesores): recargar la página no cierra la sesión.
// La firma incluye un resumen de la clave/PIN vigente: si cambia la clave o el PIN, todas las sesiones anteriores caducan.
import crypto from "node:crypto";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (s) return s.length >= 32 || process.env.NODE_ENV === "development" ? s : null;
  return process.env.NODE_ENV === "development" ? "ede-local-session-secret" : null;
};
const mac = (v, s) => crypto.createHmac("sha256", s).update(v).digest("base64url");
const short = (x) => crypto.createHash("sha256").update(String(x)).digest("base64url").slice(0, 16);

export function readCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}

// kind: "adm" | "adv"; who: identificador (p. ej. código del asesor); bind: clave o hash del PIN vigente
export function makeSession(kind, who, bind, hours) {
  const s = secret();
  if (!s) return null;
  const v = `${kind}|${who}|${Date.now() + hours * 3600 * 1000}|${short(bind)}`;
  return `${Buffer.from(v).toString("base64url")}.${mac(v, s)}`;
}

// Devuelve { who } si la cookie es válida para ese tipo y la clave/PIN vigente; si no, null
export function readSession(token, kind, bindOf) {
  const s = secret();
  if (!s || !token || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  let v;
  try { v = Buffer.from(b64, "base64url").toString(); } catch { return null; }
  const good = Buffer.from(mac(v, s)), got = Buffer.from(sig || "");
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  const [k, who, exp, b] = v.split("|");
  if (k !== kind || !(Number(exp) > Date.now())) return null;
  const bind = bindOf(who);
  if (bind == null || short(bind) !== b) return null;
  return { who };
}

export const cookieOpts = (hours) => ({ httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: hours * 3600 });
