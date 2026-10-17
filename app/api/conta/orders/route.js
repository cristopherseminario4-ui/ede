import { NextResponse } from "next/server";
import { currentStaff, requireStaff } from "@/lib/staff";
import { listForAccounting } from "@/lib/orders";
import { mailEnabled } from "@/lib/mail";

export const dynamic = "force-dynamic";

// Sin sesión responde 200 con user:null para que la pantalla muestre el login sin ruido.
export async function GET() {
  const user = await currentStaff();
  if (!user) return NextResponse.json({ user: null });
  const orders = listForAccounting().map((o) => ({
    code: o.code, zone: o.zone, price: o.price, status: o.status, nombre: o.nombre, dni: o.dni, correo: o.correo, telefono: o.telefono,
    comprobante: o.comprobante, ruc: o.ruc, razonSocial: o.razonSocial, paidAt: o.paidAt, payDate: o.payDate,
    opNumber: o.manualRef || (o.mpPaymentId ? `MP ${o.mpPaymentId}` : ""), paymentMethod: o.paymentMethod, payBank: o.payBank, advisorName: o.advisorName,
    voucherToken: o.voucherToken,
    docNumber: o.docNumber, docDate: o.docDate, docToken: o.docToken, docBy: o.docBy, docSentAt: o.docSentAt, docMailError: o.docMailError,
  }));
  return NextResponse.json({ user: { name: user.name }, orders, mailEnabled: mailEnabled() });
}
