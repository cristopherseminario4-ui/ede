import { getDb, getOrder, expireStale, pendingAbonoSyncs } from "@/lib/orders";
import { syncOrderToDjango, syncAbonosOfOrder } from "@/lib/django";
import { retryDriveCopies } from "@/lib/drive";

// Reintenta hasta 20 ventas con error de envío al sistema de entradas (las más antiguas primero)
export async function retryFailedSyncs() {
  expireStale();
  const codes = getDb()
    .prepare("SELECT code FROM orders WHERE status IN ('paid','in_review') AND sync_status = 'error' AND COALESCE(sale_kind,'total') = 'total' ORDER BY COALESCE(sync_at, created_at) ASC LIMIT 20")
    .all()
    .map((r) => r.code);
  for (const code of codes) {
    const o = getOrder(code);
    if (o) await syncOrderToDjango(o);
  }
  for (const code of [...new Set(pendingAbonoSyncs().map((a) => a.orderCode))]) await syncAbonosOfOrder(code);
  await retryDriveCopies();
  return codes.length;
}
