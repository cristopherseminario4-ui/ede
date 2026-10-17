"use client";
import { useState } from "react";
import { ZONES } from "@/lib/config";

const STATUS = { pending: "Pendiente", paid: "Pagado", "paid-demo": "Pagado (demo)", awaiting_terms: "Esperando T&C", in_review: "En revisión (contabilidad)", cancelled: "Anulado" };

export default function Admin() {
  const [key, setKey] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("");
  const [advisors, setAdvisors] = useState([]);
  const [na, setNa] = useState({ code: "", name: "", pin: "" });
  const [aerr, setAerr] = useState("");
  const [staff, setStaff] = useState([]);
  const [ns, setNs] = useState({ username: "", name: "", password: "" });
  const [serr, setSerr] = useState("");

  async function load(k = key) {
    setErr("");
    const r = await fetch("/api/admin/orders", { headers: { "x-admin-key": k } });
    const d = await r.json();
    if (!r.ok) { setErr(d.error || "Error"); setData(null); return; }
    setData(d);
    loadAdvisors(k);
    loadStaff(k);
  }
  async function loadStaff(k = key) {
    const r = await fetch("/api/admin/staff", { headers: { "x-admin-key": k } });
    if (r.ok) setStaff((await r.json()).staff);
  }
  async function staffAct(body) {
    setSerr("");
    const r = await fetch("/api/admin/staff", { method: "POST", headers: { "x-admin-key": key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) return setSerr(d.error || "Error");
    setStaff(d.staff);
    if (body.name) setNs({ username: "", name: "", password: "" });
  }
  async function loadAdvisors(k = key) {
    const r = await fetch("/api/admin/advisors", { headers: { "x-admin-key": k } });
    if (r.ok) setAdvisors((await r.json()).advisors);
  }
  async function advisorAct(body) {
    setAerr("");
    const r = await fetch("/api/admin/advisors", { method: "POST", headers: { "x-admin-key": key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) return setAerr(d.error || "Error");
    setAdvisors(d.advisors);
    if (body.name) setNa({ code: "", name: "", pin: "" });
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
              <thead><tr><th>Código</th><th>Zona</th><th>Titular</th><th>DNI</th><th>Contacto</th><th>S/</th><th>Estado</th><th>Origen</th><th>N.º operación / voucher</th><th>Sistema QR</th><th>Fecha</th><th /></tr></thead>
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
                    <td><small>{o.advisorName ? `Asesor · ${o.advisorName}` : "Web"}<br />{o.paymentMethod && o.paymentMethod !== "mercadopago" ? o.paymentMethod : ""}</small></td>
                    <td><small>{o.manualRef || o.mpPaymentId ? <b>{o.manualRef || `MP ${o.mpPaymentId}`}</b> : "—"}{o.payDate ? <><br />{o.payDate} · S/ {o.payAmount}{o.payBank ? ` · ${o.payBank}` : ""}</> : null}{o.voucherToken ? <><br /><a href={`/v/${o.voucherToken}`} target="_blank" rel="noreferrer">Ver voucher</a></> : null}</small></td>
                    <td title={o.syncError || ""}><small>{o.syncStatus === "ok" ? "✔ Enviado" : o.syncStatus === "error" ? "✖ Error" : o.syncStatus === "skipped" ? "— Sin config." : "—"}</small></td>
                    <td><small>{new Date(o.createdAt).toLocaleString("es-PE")}</small></td>
                    <td className="acts">
                      {o.status === "paid" && o.syncStatus !== "ok" && <button onClick={() => resync(o.code)}>Reenviar a QR</button>}
                      {o.status !== "paid" && <button onClick={() => setStatus(o.code, "paid")}>Marcar pagado</button>}
                      {o.status !== "cancelled" && <button onClick={() => setStatus(o.code, "cancelled")}>Anular</button>}
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan="12" style={{ textAlign: "center", color: "var(--mute)" }}>Sin pedidos</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 style={{ marginTop: 56 }}>Asesores</h2>
          <p className="note">Cada asesor tiene un link de venta online (<code>/?a=codigo</code>) y un portal (<code>/asesor</code>) con código y PIN para registrar ventas cobradas fuera de la web.</p>
          <div className="admin-tools">
            <input placeholder="Código (ej. carlos)" value={na.code} onChange={(e) => setNa({ ...na, code: e.target.value })} />
            <input placeholder="Nombre" value={na.name} onChange={(e) => setNa({ ...na, name: e.target.value })} />
            <input placeholder="PIN (4-8 dígitos)" inputMode="numeric" value={na.pin} onChange={(e) => setNa({ ...na, pin: e.target.value })} />
            <button className="btn ghost" onClick={() => advisorAct(na)}>Crear asesor</button>
          </div>
          {aerr && <p className="err">{aerr}</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Código</th><th>Nombre</th><th>Link de venta</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {advisors.map((a) => (
                  <tr key={a.code}>
                    <td><b>{a.code}</b></td><td>{a.name}</td><td><small>{a.link}</small></td>
                    <td>{a.active ? "Activo" : "Inactivo"}</td>
                    <td className="acts">
                      <button onClick={() => advisorAct({ code: a.code, active: !a.active })}>{a.active ? "Desactivar" : "Activar"}</button>
                      <button onClick={() => { const pin = prompt("Nuevo PIN (4-8 dígitos)"); if (pin) advisorAct({ code: a.code, pin }); }}>Cambiar PIN</button>
                    </td>
                  </tr>
                ))}
                {!advisors.length && <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--mute)" }}>Aún no hay asesores</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 style={{ marginTop: 56 }}>Usuarios de contabilidad</h2>
          <p className="note">Entran en <code>/contabilidad</code> con su propio usuario y clave (separado del sistema de entradas y de esta clave de administración). Ahí registran las boletas y facturas y las envían por correo.</p>
          <div className="admin-tools">
            <input placeholder="Usuario (ej. maria.conta)" value={ns.username} onChange={(e) => setNs({ ...ns, username: e.target.value })} />
            <input placeholder="Nombre" value={ns.name} onChange={(e) => setNs({ ...ns, name: e.target.value })} />
            <input placeholder="Clave (mín. 6)" type="password" value={ns.password} onChange={(e) => setNs({ ...ns, password: e.target.value })} />
            <button className="btn ghost" onClick={() => staffAct(ns)}>Crear usuario</button>
          </div>
          {serr && <p className="err">{serr}</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>Nombre</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.username}>
                    <td><b>{s.username}</b></td><td>{s.name}</td><td>{s.active ? "Activo" : "Inactivo"}</td>
                    <td className="acts">
                      <button onClick={() => staffAct({ username: s.username, active: !s.active })}>{s.active ? "Desactivar" : "Activar"}</button>
                      <button onClick={() => { const password = prompt("Nueva clave (mín. 6)"); if (password) staffAct({ username: s.username, password }); }}>Cambiar clave</button>
                    </td>
                  </tr>
                ))}
                {!staff.length && <tr><td colSpan="4" style={{ textAlign: "center", color: "var(--mute)" }}>Aún no hay usuarios de contabilidad</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
