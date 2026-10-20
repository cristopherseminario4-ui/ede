"use client";
import { useEffect, useState } from "react";
import { ZONES } from "@/lib/config";

const today = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10); // fecha de Lima

// Datos ficticios para el entorno de demostración (Vercel, sin base de datos)
const DEMO_USER = "demo", DEMO_PASS = "demo2026";
const DEMO_ORDERS = [
  { code: "EDE26-K7QA", zone: "vip", price: 1000, status: "paid", nombre: "María Quispe Rojas", dni: "45123789", correo: "maria@ejemplo.com", comprobante: "boleta", opNumber: "88213467", payDate: "2026-10-14", advisorName: "Carlos R." },
  { code: "EDE26-M3TD", zone: "emprendedor", price: 150, status: "in_review", nombre: "José Huamán Díaz", dni: "70234561", correo: "jose@ejemplo.com", comprobante: "boleta", opNumber: "00457712", payDate: "2026-10-15", advisorName: "Lucía P." },
  { code: "EDE26-P9ZW", zone: "empresarial", price: 1999, status: "paid", nombre: "Inversiones Andes SAC", dni: "20601234", ruc: "20601234567", razonSocial: "INVERSIONES ANDES S.A.C.", correo: "compras@andes.example", comprobante: "factura", opNumber: "MP 1325578891", payDate: "2026-10-16" },
  { code: "EDE26-T5NB", zone: "emprendedor", price: 150, status: "paid", nombre: "Ana Torres Vega", dni: "41887765", correo: "ana@ejemplo.com", comprobante: "boleta", opNumber: "MP 1325601120", payDate: "2026-10-16", docToken: "demo", docNumber: "EB01-117", docDate: "2026-10-16", docBy: "Contabilidad (demo)", docSentAt: "2026-10-16T15:00:00Z" },
];

export default function Contabilidad({ demo = false }) {
  const [me, setMe] = useState(demo ? null : undefined); // undefined = cargando, null = sin sesión
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
    if (demo) return;
    const r = await fetch("/api/conta/orders", { cache: "no-store" });
    const d = await r.json();
    setMe(d.user); if (d.user) setData(d);
  }
  useEffect(() => { load(); }, []);
  const dsave = (code, patch) => setData((d) => ({ ...d, orders: d.orders.map((o) => (o.code === code ? { ...o, ...patch } : o)) }));

  async function doLogin(e) {
    e.preventDefault(); setErr("");
    if (demo) {
      if (login.username.trim().toLowerCase() !== DEMO_USER || login.password !== DEMO_PASS) return setErr("Usuario o clave incorrectos.");
      setData({ orders: DEMO_ORDERS, mailEnabled: true }); setMe({ name: "Contabilidad (demo)" }); return;
    }
    setBusy(true);
    const r = await fetch("/api/conta/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(login) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) return setErr(d.error || "Error");
    load();
  }
  async function logout() { if (demo) return setMe(null); await fetch("/api/conta/logout", { method: "POST" }); setMe(null); }

  async function emitir(e) {
    e.preventDefault(); setMsg("");
    if (demo) {
      dsave(open.code, { docToken: "demo", docNumber: f.docNumber.toUpperCase(), docDate: f.docDate, docBy: "Contabilidad (demo)", docSentAt: f.enviar ? new Date().toISOString() : null });
      setMsg(f.enviar ? "✔ Comprobante registrado y enviado por correo (simulado en la demo)." : "✔ Comprobante registrado.");
      setOpen(null); setFile(null); setF({ docNumber: "", docDate: today(), enviar: true }); return;
    }
    setBusy(true);
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
    if (demo) { dsave(code, { docSentAt: new Date().toISOString() }); return setMsg("✔ Correo reenviado (simulado en la demo)."); }
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
          {demo && <p className="note">Acceso de demostración con datos ficticios.<br />Usuario: <b>{DEMO_USER}</b> · Clave: <b>{DEMO_PASS}</b></p>}
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
        <button className="btn ghost" onClick={() => { if (!demo) return (window.location.href = "/api/conta/export"); const rows = pend.map((o) => [o.comprobante, o.ruc || o.dni, o.razonSocial || o.nombre, o.correo, o.price, o.opNumber, o.code].join(",")); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["tipo,documento,nombre,correo,total,operacion,pedido\n" + rows.join("\n")], { type: "text/csv" })); a.download = "pendientes-comprobante-demo.csv"; a.click(); }}>CSV para el facturador</button>
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
                <td><b>{o.opNumber || "—"}</b><br /><small>{o.payDate || ""}{o.advisorName ? ` · ${o.advisorName}` : ""}</small>{o.voucherToken && <><br /><a href={`/v/${o.voucherToken}`} target="_blank" rel="noreferrer">Ver voucher</a></>}{o.voucherDrive && <> · <a href={o.voucherDrive} target="_blank" rel="noreferrer">Drive</a></>}</td>
                {tab === "emitidos" && <td><b>{o.docNumber}</b><br /><small>{o.docDate} · {o.docBy}</small><br /><a href={`/c/${o.docToken}`} target="_blank" rel="noreferrer">PDF</a>
                  <br /><small>{o.docSentAt ? `✔ Enviado ${o.docSentAt.slice(0, 10)}` : o.docMailError ? `✖ ${o.docMailError.slice(0, 40)}` : "Sin enviar"}</small></td>}
                <td className="acts">
                  {tab === "pendientes" ? <button onClick={() => { setOpen(o); setMsg(""); setF({ docNumber: o.comprobante === "factura" ? "E001-" : "EB01-", docDate: today(), enviar: true }); }}>Registrar comprobante</button>
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
              <div className="field"><label>Serie y número</label><input required value={f.docNumber} onChange={(e) => setF({ ...f, docNumber: e.target.value })} placeholder={open.comprobante === "factura" ? "E001-123" : "EB01-123"} /></div>
              <div className="field"><label>Fecha de emisión</label><input required type="date" value={f.docDate} max={today()} onChange={(e) => setF({ ...f, docDate: e.target.value })} /></div>
            </div>
            <div className="field"><label>PDF de la {open.comprobante === "factura" ? "factura" : "boleta"}</label><input required={!demo} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <label className="check"><input type="checkbox" checked={f.enviar} onChange={(e) => setF({ ...f, enviar: e.target.checked })} /><span>Enviar al correo del cliente al guardar.</span></label>
            {msg && <p className="err">{msg}</p>}
            <button className="btn" style={{ width: "100%", justifyContent: "space-between", marginTop: 18 }} disabled={busy}>{busy ? "Guardando…" : "Guardar comprobante"} <span aria-hidden>→</span></button>
          </form>
        </div>
      )}
    </main>
  );
}
