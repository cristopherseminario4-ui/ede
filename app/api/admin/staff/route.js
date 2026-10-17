import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createStaff, listStaff, setStaffActive, resetStaffPassword } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ staff: listStaff() });
}

// POST { username, name, password } crea · { username, active } activa/desactiva · { username, password } cambia la clave
export async function POST(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  try {
    if (typeof b.active === "boolean") setStaffActive(b.username, b.active);
    else if (b.name) createStaff(b);
    else if (b.password) resetStaffPassword(b.username, b.password);
    else return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  } catch (e) {
    const dup = /UNIQUE|PRIMARY/i.test(String(e.message));
    return NextResponse.json({ error: dup ? "Ese usuario ya existe." : e.message }, { status: 400 });
  }
  return NextResponse.json({ staff: listStaff() });
}
