import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/staff";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearCookie.name, "", clearCookie.options);
  return res;
}
