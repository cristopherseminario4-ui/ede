import fs from "node:fs";
import path from "node:path";
import { getOrderByDocToken } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Descarga del comprobante (boleta/factura) con su link secreto, el mismo que va en el correo del cliente.
export async function GET(_req, { params }) {
  const { token } = await params;
  const order = getOrderByDocToken(token);
  const file = order?.docFile;
  if (!file || file.includes("/") || file.includes("\\")) return new Response("No encontrado", { status: 404 });
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "data", "comprobantes", file));
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="Comprobante-${order.docNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf"`,
      },
    });
  } catch { return new Response("No encontrado", { status: 404 }); }
}
