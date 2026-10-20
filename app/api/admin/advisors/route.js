import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdvisor, listAdvisors, setAdvisorActive, resetAdvisorPin } from "@/lib/orders";
import { signAdvisor } from "@/lib/validate";

export const dynamic = "force-dynamic";
const base = () => process.env.BASE_URL || "http://localhost:3100";
const withLink = (a) => ({ ...a, link: `${base()}/?a=${signAdvisor(a.code)}` });

export async function GET(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ advisors: listAdvisors().map(withLink) });
}

// POST { code, name, pin } crea · { code, active } activa/desactiva · { code, pin } cambia PIN
export async function POST(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  try {
    if (typeof b.active === "boolean") setAdvisorActive(b.code, b.active);
    else if (b.name) createAdvisor(b);
    else if (b.pin) resetAdvisorPin(b.code, b.pin);
    else return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  } catch (e) {
    const dup = /UNIQUE|PRIMARY/i.test(String(e.message));
    return NextResponse.json({ error: dup ? "Ese código de asesor ya existe." : e.message }, { status: 400 });
  }
  return NextResponse.json({ advisors: listAdvisors().map(withLink) });
}
