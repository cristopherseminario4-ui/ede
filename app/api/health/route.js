import { NextResponse } from "next/server";
import { availability } from "@/lib/availability";

export const dynamic = "force-dynamic";

// Chequeo de salud para el hosting (Render) y monitores externos: confirma que la base responde. No expone datos.
export async function GET() {
  try {
    if (process.env.PREVIEW_MODE !== "1") availability();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
