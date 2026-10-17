"use client";
import { useState } from "react";
import { ZONES } from "@/lib/config";

const STATUS = { pending: "Pendiente", paid: "Pagado", "paid-demo": "Pagado (demo)", cancelled: "Anulado" };

export default function Admin() {
  const [key, setKey] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("");

  async function load(k = key) {
    setErr("");
    const r = await fetch("/api/admin/orders", { headers: { "x-admin-key": k } });
    const d = await r.json();
    if (!r.ok) { setErr(d.error || "Error"); setData(null); return; }
    setData(d);
  }
  async function setStatus(code, status) {
    await fetch(`/api/admin/orders/${code}`, { method: "PATCH", headers: { "x-admin-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }
  async function resync(code) {
    await fetch(`/api/admin/orders/${code}/sync`, { method: "POST", headers: { "x-admin-key": key } });
    load();
  }
  async function exportCsv() {
    const r = await fetch("/api/admin/export", { headers: { "x-admin-key": key } });
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a"); a.href = url; a.download = "pedidos-ede.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const rows = (data?.orders || []).filter((o) =>
    (!zone || o.zone === zone) && (!q || `${o.code} ${o.nombre} ${o.dni} ${o.correo}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <main className="page admin" data-lenis-prevent>
      <p className="eyebrow">Panel interno</p>
      <h1>Pedidos</h1>
      {!data ? (
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="admin-login">
          <div className="field"><label>Clave de administración</label><input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus /></div>
          {err && <p className="err">{err}</p>}
          <button className="btn">Entrar <span aria-hidden>→</span></button>
        </form>
      ) : (
        <>
          <div className="admin-stats">
            <div><b>{data.totals.orders}</b><span>Pedidos</span></div>
            <div><b>{data.totals.paid}</b><span>Pagados</span></div>
            <div><b>S/ {data.totals.revenue.toLocaleString("es-PE")}</b><span>Ingresos reales</span></div>
            {ZONES.map((z) => (
              <div key={z.id}><b>{data.availability[z.id].left}</b><span>Libres · {z.name}</span></div>
            ))}
          </div>
          <div className="admin-tools">
            <input placeholder="Buscar por código, nombre, DNI o correo" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">Todas las zonas</option>
              {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <button className="btn ghost" onClick={() => load()}>Actualizar</button>
            <button className="btn ghost" onClick={exportCsv}>Exportar CSV</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Código</th><th>Zona</th><th>Titular</th><th>DNI</th><th>Contacto</th><th>S/</th><th>Estado</th><th>Sistema QR</th><th>Fecha</th><th /></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.code}>
                    <td><b>{o.code}</b></td>
                    <td>{o.zone}</td>
                    <td>{o.nombre}</td>
                    <td>{o.dni}</td>
                    <td>{o.telefono}<br /><small>{o.correo}</small></td>
                    <td>{o.price}</td>
                    <td><span className={`st st-${o.status}`}>{STATUS[o.status] || o.status}</span></td>
                    <td title={o.syncError || ""}><small>{o.syncStatus === "ok" ? "✔ Enviado" : o.syncStatus === "error" ? "✖ Error" : o.syncStatus === "skipped" ? "— Sin config." : "—"}</small></td>
                    <td><small>{new Date(o.createdAt).toLocaleString("es-PE")}</small></td>
                    <td className="acts">
                      {o.status === "paid" && o.syncStatus !== "ok" && <button onClick={() => resync(o.code)}>Reenviar a QR</button>}
                      {o.status !== "paid" && <button onClick={() => setStatus(o.code, "paid")}>Marcar pagado</button>}
                      {o.status !== "cancelled" && <button onClick={() => setStatus(o.code, "cancelled")}>Anular</button>}
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan="10" style={{ textAlign: "center", color: "var(--mute)" }}>Sin pedidos</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
