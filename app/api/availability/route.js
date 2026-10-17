import { NextResponse } from "next/server";
import { availability } from "@/lib/availability";
import { ZONES } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  // Vista previa de diseño (sin base de datos): todos los cupos libres
  if (process.env.PREVIEW_MODE === "1") return NextResponse.json(Object.fromEntries(ZONES.map((z) => [z.id, { seats: z.seats, sold: 0, left: z.seats }])));
  return NextResponse.json(availability(), { headers: { "Cache-Control": "no-store" } });
}
