import fs from "node:fs";
import path from "node:path";
import { getOrderByVoucherToken } from "@/lib/orders";

export const dynamic = "force-dynamic";
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

// Comprobante de pago: se abre solo con su link secreto (lo usa contabilidad desde el panel de Django o el panel interno).
export async function GET(_req, { params }) {
  const { token } = await params;
  const order = getOrderByVoucherToken(token);
  const file = order?.voucherFile;
  if (!file || file.includes("/") || file.includes("\\")) return new Response("No encontrado", { status: 404 });
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "data", "vouchers", file));
    return new Response(buf, {
      headers: {
        "Content-Type": TYPES[file.split(".").pop()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "private, no-store", "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'",
        "Content-Disposition": file.endsWith(".pdf") ? `attachment; filename="voucher-${order.code}.pdf"` : "inline",
      },
    });
  } catch { return new Response("No encontrado", { status: 404 }); }
}
