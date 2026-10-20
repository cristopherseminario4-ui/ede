import { NextResponse } from "next/server";
import { csvCell as esc } from "@/lib/validate";
import { requireAdmin } from "@/lib/admin";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";


export async function GET(req) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const cols = ["code", "zone", "price", "status", "nombre", "dni", "telefono", "correo", "advisorName", "paymentMethod", "manualRef", "payDate", "payAmount", "payBank", "mpPaymentId", "comprobante", "ruc", "razonSocial", "termsVersion", "acceptedAt", "createdAt", "paidAt"];
  const rows = listOrders().map((o) => cols.map((c) => esc(o[c])).join(","));
  const csv = "﻿" + [cols.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pedidos-ede.csv"' },
  });
}
