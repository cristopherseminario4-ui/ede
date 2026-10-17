import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

const esc = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita inyección de fórmulas al abrir en Excel
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const cols = ["code", "zone", "price", "status", "nombre", "dni", "telefono", "correo", "comprobante", "ruc", "razonSocial", "termsVersion", "acceptedAt", "createdAt", "paidAt"];
  const rows = listOrders().map((o) => cols.map((c) => esc(o[c])).join(","));
  const csv = "﻿" + [cols.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pedidos-ede.csv"' },
  });
}
