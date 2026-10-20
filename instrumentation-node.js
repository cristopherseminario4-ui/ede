// Una sola instancia: cada 5 minutos reintenta enviar al sistema de entradas las ventas que fallaron
// (p. ej. si Django estaba dormido o caído) y vence las ventas de asesor sin aceptar.
import { retryFailedSyncs } from "./lib/jobs.js";

if (process.env.PREVIEW_MODE !== "1" && !globalThis.__edeJobs) {
  globalThis.__edeJobs = true;
  const tick = () => retryFailedSyncs().catch((e) => console.error("[jobs]", e?.message || e));
  setTimeout(tick, 30_000);
  setInterval(tick, 5 * 60_000).unref?.();
}
