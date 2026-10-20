// Copia de vouchers y comprobantes a una carpeta PRIVADA de Google Drive mediante un flujo de n8n.
// El original siempre queda en el servidor: si n8n o Google fallan, no se pierde nada y la copia se reintenta.
import fs from "node:fs";
import path from "node:path";
import { getDb, getOrder, updateOrder } from "@/lib/orders";
import { limaDate } from "@/lib/validate";

const cfg = () => ({ url: process.env.N8N_DRIVE_URL || "", token: process.env.N8N_DRIVE_TOKEN || "" });
export const driveEnabled = () => { const c = cfg(); return !!(c.url && c.token); };

const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
const inflight = globalThis.__edeDrive || (globalThis.__edeDrive = new Set());

// kind: "voucher" | "comprobante"
export async function copyToDrive(code, kind) {
  const c = cfg();
  if (!c.url || !c.token) return null;
  const key = `${code}:${kind}`;
  if (inflight.has(key)) return null;
  inflight.add(key);
  try {
    const o = getOrder(code);
    const file = kind === "voucher" ? o?.voucherFile : o?.docFile;
    if (!o || !file || /[\\/]/.test(file)) return null;
    const dir = kind === "voucher" ? "vouchers" : "comprobantes";
    const buf = fs.readFileSync(path.join(process.cwd(), "data", dir, file));
    const ext = file.split(".").pop();
    const fd = new FormData();
    fd.append("data", new Blob([buf], { type: MIME[ext] || "application/octet-stream" }), `${code}.${ext}`);
    fd.append("code", code);
    fd.append("tipo", kind === "voucher" ? `voucher ${o.paymentMethod || ""} ${o.manualRef || ""}`.trim() : `comprobante ${o.docNumber || ""}`.trim());
    fd.append("fecha", limaDate(o.createdAt));
    const r = await fetch(c.url, { method: "POST", headers: { "x-ede-token": c.token }, body: fd, signal: AbortSignal.timeout(30_000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok || !/^https:\/\/drive\.google\.com\//.test(j.url || "")) return null;
    updateOrder(code, kind === "voucher" ? { voucherDrive: j.url } : { docDrive: j.url });
    return j.url;
  } catch {
    return null;
  } finally {
    inflight.delete(key);
  }
}

// Reintento periódico de las copias pendientes (lo llama lib/jobs.js)
export async function retryDriveCopies() {
  if (!driveEnabled()) return 0;
  const db = getDb();
  const v = db.prepare("SELECT code FROM orders WHERE voucher_file IS NOT NULL AND voucher_drive IS NULL AND status NOT IN ('cancelled','expired') LIMIT 10").all();
  const d = db.prepare("SELECT code FROM orders WHERE doc_file IS NOT NULL AND doc_drive IS NULL LIMIT 10").all();
  for (const { code } of v) await copyToDrive(code, "voucher");
  for (const { code } of d) await copyToDrive(code, "comprobante");
  return v.length + d.length;
}
