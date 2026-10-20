import { NextResponse } from "next/server";
import { clearCookie, currentStaff } from "@/lib/staff";
import { bumpStaffSession } from "@/lib/orders";

// Cerrar sesión invalida TODAS las cookies de ese usuario (no solo la de este navegador)
export async function POST() {
  const u = await currentStaff();
  if (u) bumpStaffSession(u.username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearCookie.name, "", clearCookie.options);
  return res;
}
