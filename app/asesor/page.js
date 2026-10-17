"use client";
import { useState } from "react";
import { ZONES, currentPrice } from "@/lib/config";

const METODOS = [["yape", "Yape"], ["plin", "Plin"], ["transferencia", "Transferencia"], ["deposito", "Depósito"], ["efectivo", "Efectivo"]];
const EMPTY = { zone: "emprendedor", nombre: "", dni: "", telefono: "", correo: "", comprobante: "boleta", ruc: "", razonSocial: "", metodoPago: "yape", referencia: "", pagoRecibido: false, banco: "", fechaPago: "", montoPagado: "" };
const MAX_MB = 5;
const STATUS = { awaiting_terms: "Esperando T&C", in_review: "En revisión de contabilidad", paid: "Entrada emitida", cancelled: "Anulada" };

export default function Asesor() {
  const [auth, setAuth] = useState({ code: "", pin: "" });
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function call(body) {
    const r = await fetch("/api/asesor/ventas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...auth, ...body }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Error");
    return d;
  }
  async function login(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { const d = await call({ list: true }); setMe(d.advisor); setOrders(d.orders); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  async function refresh() { try { const d = await call({ list: true }); setOrders(d.orders); } catch {} }
  const [file, setFile] = useState(null);
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true); setLast(null);
    try {
      if (file && file.size > MAX_MB * 1024 * 1024) throw new Error(`El comprobante pesa más de ${MAX_MB} MB.`);
      const fd = new FormData();
      Object.entries({ ...auth, ...f }).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append("voucher", file);
      const r = await fetch("/api/asesor/ventas", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      setFile(null); e.target.reset?.(); setLast(d.order); setF({ ...EMPTY, zone: f.zone }); refresh(); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  const wa = (o) => {
    const tel = o.telefono.replace(/\D/g, "");
    const msg = `Hola ${o.nombre.split(" ")[0]}, soy ${me.name} de EDE 2.0. Para emitir tu entrada (Zona ${o.zone}) confirma tus datos y acepta los Términos y Condiciones aquí: ${o.acceptUrl}`;
    return `https://wa.me/${tel.length === 9 ? "51" + tel : tel}?text=${encodeURIComponent(msg)}`;
  };
  const copy = (t) => navigator.clipboard?.writeText(t);

  if (!me)
    return (
      <main className="page narrow">
        <p className="eyebrow">Equipo de ventas</p>
        <h1>Portal del asesor</h1>
        <form onSubmit={login} className="admin-login">
          <div className="field"><label>Tu código</label><input value={auth.code} onChange={(e) => setAuth({ ...auth, code: e.target.value })} autoCapitalize="none" autoFocus /></div>
          <div className="field"><label>PIN</label><input type="password" inputMode="numeric" value={auth.pin} onChange={(e) => setAuth({ ...auth, pin: e.target.value })} /></div>
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy}>Entrar <span aria-hidden>→</span></button>
        </form>
      </main>
    );

  return (
    <main className="page admin" data-lenis-prevent>
      <p className="eyebrow">Asesor · {me.name}</p>
      <h1>Registrar venta</h1>
      <p className="lead">Registra la venta cobrada fuera de la web. El cliente recibe un link para confirmar sus datos y aceptar los Términos y Condiciones: <b>sin esa aceptación no se emite la entrada</b>.</p>
      <p className="note">Tu link para ventas online (el cliente paga con Mercado Pago): <b>{typeof window !== "undefined" ? window.location.origin : ""}/?a={me.code}</b></p>

      <form onSubmit={submit} className="advisor-form">
        <div className="row2">
          <div className="field"><label>Zona</label>
            <select value={f.zone} onChange={set("zone")}>{ZONES.map((z) => <option key={z.id} value={z.id}>{z.name} · S/ {currentPrice(z)}</option>)}</select></div>
          <div className="field"><label>Cómo pagó</label>
            <select value={f.metodoPago} onChange={set("metodoPago")}>{METODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        </div>
        <div className="field"><label>Nombre completo del asistente</label><input required value={f.nombre} onChange={set("nombre")} /></div>
        <div className="row2">
          <div className="field"><label>DNI / documento</label><input required value={f.dni} onChange={set("dni")} inputMode="numeric" /></div>
          <div className="field"><label>WhatsApp</label><input required value={f.telefono} onChange={set("telefono")} inputMode="tel" /></div>
        </div>
        <div className="field"><label>Correo</label><input required type="email" value={f.correo} onChange={set("correo")} /></div>
        <div className="row2">
          <div className="field"><label>Comprobante</label>
            <select value={f.comprobante} onChange={set("comprobante")}><option value="boleta">Boleta</option><option value="factura">Factura</option></select></div>
          <div className="field"><label>{f.metodoPago === "efectivo" ? "N.º de recibo (opcional)" : "N.º de operación (como sale en el voucher)"}</label><input value={f.referencia} onChange={set("referencia")} required={f.metodoPago !== "efectivo"} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Fecha del pago</label><input type="date" required value={f.fechaPago} onChange={set("fechaPago")} max={new Date().toISOString().slice(0, 10)} /></div>
          <div className="field"><label>Monto pagado (S/)</label><input required inputMode="decimal" value={f.montoPagado} onChange={set("montoPagado")} placeholder={`${currentPrice(ZONES.find((z) => z.id === f.zone))}`} /></div>
        </div>
        <div className="field"><label>Banco / billetera (opcional)</label><input value={f.banco} onChange={set("banco")} placeholder="BCP, Interbank, Yape…" /></div>
        {f.comprobante === "factura" && (
          <div className="row2">
            <div className="field"><label>RUC</label><input value={f.ruc} onChange={set("ruc")} inputMode="numeric" /></div>
            <div className="field"><label>Razón social</label><input value={f.razonSocial} onChange={set("razonSocial")} /></div>
          </div>
        )}
        <div className="field"><label>Foto del voucher / comprobante {f.metodoPago === "efectivo" ? "(opcional en efectivo)" : "(obligatorio)"}</label>
          <input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        <label className="check"><input type="checkbox" checked={f.pagoRecibido} onChange={set("pagoRecibido")} /><span>Confirmo que ya recibí el pago completo del cliente.</span></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "Registrando…" : "Registrar y generar link"} <span aria-hidden>→</span></button>
      </form>

      {last && (
        <div className="advisor-last">
          <p className="eyebrow">Venta registrada · {last.code}</p>
          <p>Envía este link al cliente para que acepte los T&C:</p>
          <p><code>{last.acceptUrl}</code></p>
          <p><a className="btn" href={wa(last)} target="_blank" rel="noreferrer">Enviar por WhatsApp <span aria-hidden>→</span></a>{" "}
            <button type="button" className="btn ghost" onClick={() => copy(last.acceptUrl)}>Copiar link</button></p>
        </div>
      )}

      <h2 style={{ marginTop: 56 }}>Mis ventas</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Zona</th><th>Cliente</th><th>S/</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.code}>
                <td><b>{o.code}</b><br /><small>{o.opNumber ? `Op. ${o.opNumber}` : ""}</small></td><td>{o.zone}</td><td>{o.nombre}<br /><small>{o.telefono}</small></td><td>{o.price}</td>
                <td><span className={`st st-${o.status}`}>{STATUS[o.status] || o.status}</span></td>
                <td className="acts">
                  {o.status === "awaiting_terms" && <><a href={wa(o)} target="_blank" rel="noreferrer"><button>Reenviar</button></a><button onClick={() => copy(o.acceptUrl)}>Copiar link</button></>}
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan="6" style={{ textAlign: "center", color: "var(--mute)" }}>Aún no registras ventas</td></tr>}
          </tbody>
        </table>
      </div>
      <p><button className="btn ghost" onClick={refresh}>Actualizar</button></p>
    </main>
  );
}
