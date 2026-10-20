import { NextResponse } from "next/server";
import { csvCell as esc, limaDate } from "@/lib/validate";
import { requireStaff } from "@/lib/staff";
import { listForAccounting } from "@/lib/orders";

export const dynamic = "force-dynamic";


// CSV de ventas SIN comprobante, con los datos que necesita el facturador (SUNAT / proveedor).
export async function GET() {
  const { res } = await requireStaff();
  if (res) return res;
  const cols = ["tipo", "documento", "nombre_o_razon_social", "direccion", "correo", "descripcion", "cantidad", "total_con_igv", "base_imponible", "igv", "fecha_pago", "n_operacion", "codigo_pedido"];
  const rows = listForAccounting().filter((o) => !o.docToken).map((o) => {
    const total = Number(o.price), base = +(total / 1.18).toFixed(2), igv = +(total - base).toFixed(2);
    const fa = o.comprobante === "factura";
    return [fa ? "FACTURA" : "BOLETA", fa ? o.ruc : o.dni, fa ? o.razonSocial : o.nombre, "", o.correo, `Entrada ${o.zone} · El Despertar del Emprendedor 2.0`, 1, total.toFixed(2), base.toFixed(2), igv.toFixed(2), o.payDate || (o.paidAt ? limaDate(o.paidAt) : ""), o.manualRef || o.mpPaymentId || "", o.code]
      .map(esc).join(",");
  });
  return new NextResponse("﻿" + [cols.join(","), ...rows].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pendientes-comprobante.csv"' },
  });
}
