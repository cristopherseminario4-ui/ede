"use client";
import { useEffect, useState } from "react";
import { ZONES } from "@/lib/config";

const today = () => new Date().toISOString().slice(0, 10);

export default function Contabilidad() {
  const [me, setMe] = useState(undefined); // undefined = cargando, null = sin sesión
  const [data, setData] = useState({ orders: [], mailEnabled: false });
  const [login, setLogin] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("pendientes");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null); // venta que se está emitiendo
  const [f, setF] = useState({ docNumber: "", docDate: today(), enviar: true });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/conta/orders", { cache: "no-store" });
    const d = await r.json();
    setMe(d.user); if (d.user) setData(d);
  }
  useEffect(() => { load(); }, []);

  async function doLogin(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/conta/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(login) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) return setErr(d.error || "Error");
    load();
  }
  async function logout() { await fetch("/api/conta/logout", { method: "POST" }); setMe(null); }

  async function emitir(e) {
    e.preventDefault(); setMsg(""); setBusy(true);
    const fd = new FormData();
    fd.append("code", open.code); fd.append("docNumber", f.docNumber); fd.append("docDate", f.docDate); fd.append("enviar", String(f.enviar));
    if (file) fd.append("pdf", file);
    const r = await fetch("/api/conta/emitir", { method: "POST", body: fd });
    const d = await r.json(); setBusy(false);
    if (!r.ok) return setMsg(d.error || "Error");
    setMsg(d.enviado ? "✔ Comprobante registrado y enviado por correo." : d.errorCorreo ? `Registrado, pero el correo falló: ${d.errorCorreo}` : "✔ Comprobante registrado.");
    setOpen(null); setFile(null); setF({ docNumber: "", docDate: today(), enviar: true }); load();
  }
  async function reenviar(code) {
    setMsg("");
    const r = await fetch("/api/conta/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const d = await r.json(); setMsg(r.ok ? "✔ Correo reenviado." : d.error); load();
  }

  if (me === undefined) return <main className="page narrow"><p className="eyebrow">Cargando…</p></main>;
  if (!me)
    return (
      <main className="page narrow">
        <p className="eyebrow">Área interna</p>
        <h1>Contabilidad</h1>
        <form onSubmit={doLogin} className="admin-login">
          <div className="field"><label>Usuario</label><input value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} autoCapitalize="none" autoFocus /></div>
          <div className="field"><label>Clave</label><input type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></div>
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy}>Entrar <span aria-hidden>→</span></button>
        </form>
      </main>
    );

  const all = data.orders;
  const pend = all.filter((o) => !o.docToken);
  const done = all.filter((o) => o.docToken);
  const list = (tab === "pendientes" ? pend : done).filter((o) => !q || `${o.code} ${o.nombre} ${o.dni} ${o.ruc || ""} ${o.opNumber} ${o.docNumber || ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="page admin" data-lenis-prevent>
      <p className="eyebrow">Contabilidad · {me.name}</p>
      <h1>Comprobantes</h1>
      <div className="admin-stats">
        <div><b>{pend.length}</b><span>Sin comprobante</span></div>
        <div><b>{done.length}</b><span>Emitidos</span></div>
        <div><b>{done.filter((o) => !o.docSentAt).length}</b><span>Sin enviar al cliente</span></div>
      </div>
      {!data.mailEnabled && <p className="note">⚠ El correo no está configurado en el servidor: los comprobantes se registran pero no se envían.</p>}

      <div className="demo-tabs">
        <button className={tab === "pendientes" ? "on" : ""} onClick={() => setTab("pendientes")}>Pendientes ({pend.length})</button>
        <button className={tab === "emitidos" ? "on" : ""} onClick={() => setTab("emitidos")}>Emitidos ({done.length})</button>
      </div>
      <div className="admin-tools">
        <input placeholder="Buscar por código, nombre, DNI/RUC, operación o serie" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" onClick={() => (window.location.href = "/api/conta/export")}>CSV para el facturador</button>
        <button className="btn ghost" onClick={load}>Actualizar</button>
        <button className="btn ghost" onClick={logout}>Salir</button>
      </div>
      {msg && <p className="note"><b>{msg}</b></p>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Tipo</th><th>Cliente</th><th>Documento</th><th>S/</th><th>Operación</th>{tab === "emitidos" && <th>Comprobante</th>}<th /></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.code}>
                <td><b>{o.code}</b><br /><small>{ZONES.find((z) => z.id === o.zone)?.name}</small></td>
                <td>{o.comprobante === "factura" ? "Factura" : "Boleta"}</td>
                <td>{o.comprobante === "factura" ? o.razonSocial : o.nombre}<br /><small>{o.correo}</small></td>
                <td>{o.comprobante === "factura" ? `RUC ${o.ruc}` : `DNI ${o.dni}`}</td>
                <td>{o.price}</td>
                <td><b>{o.opNumber || "—"}</b><br /><small>{o.payDate || ""}{o.advisorName ? ` · ${o.advisorName}` : ""}</small>{o.voucherToken && <><br /><a href={`/v/${o.voucherToken}`} target="_blank" rel="noreferrer">Ver voucher</a></>}</td>
                {tab === "emitidos" && <td><b>{o.docNumber}</b><br /><small>{o.docDate} · {o.docBy}</small><br /><a href={`/c/${o.docToken}`} target="_blank" rel="noreferrer">PDF</a>
                  <br /><small>{o.docSentAt ? `✔ Enviado ${o.docSentAt.slice(0, 10)}` : o.docMailError ? `✖ ${o.docMailError.slice(0, 40)}` : "Sin enviar"}</small></td>}
                <td className="acts">
                  {tab === "pendientes" ? <button onClick={() => { setOpen(o); setMsg(""); }}>Registrar comprobante</button>
                    : <button onClick={() => reenviar(o.code)}>{o.docSentAt ? "Reenviar correo" : "Enviar correo"}</button>}
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="8" style={{ textAlign: "center", color: "var(--mute)" }}>{tab === "pendientes" ? "No hay ventas pendientes de comprobante" : "Aún no hay comprobantes emitidos"}</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <form className="modal" onSubmit={emitir} data-lenis-prevent>
            <button type="button" className="close" onClick={() => setOpen(null)} aria-label="Cerrar">×</button>
            <h3>{open.comprobante === "factura" ? "Factura" : "Boleta"} · {open.code}</h3>
            <p className="sub">{open.comprobante === "factura" ? `${open.razonSocial} · RUC ${open.ruc}` : `${open.nombre} · DNI ${open.dni}`} · S/ {open.price} · se enviará a {open.correo}</p>
            <div className="row2">
              <div className="field"><label>Serie y número</label><input required value={f.docNumber} onChange={(e) => setF({ ...f, docNumber: e.target.value })} placeholder={open.comprobante === "factura" ? "F001-123" : "B001-123"} /></div>
              <div className="field"><label>Fecha de emisión</label><input required type="date" value={f.docDate} max={today()} onChange={(e) => setF({ ...f, docDate: e.target.value })} /></div>
            </div>
            <div className="field"><label>PDF de la {open.comprobante === "factura" ? "factura" : "boleta"}</label><input required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <label className="check"><input type="checkbox" checked={f.enviar} onChange={(e) => setF({ ...f, enviar: e.target.checked })} /><span>Enviar al correo del cliente al guardar.</span></label>
            {msg && <p className="err">{msg}</p>}
            <button className="btn" style={{ width: "100%", justifyContent: "space-between", marginTop: 18 }} disabled={busy}>{busy ? "Guardando…" : "Guardar comprobante"} <span aria-hidden>→</span></button>
          </form>
        </div>
      )}
    </main>
  );
}
