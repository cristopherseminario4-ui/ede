"use client";
import { useEffect, useState } from "react";
import { ZONES, currentPrice } from "@/lib/config";

const METODOS = [["yape", "Yape"], ["plin", "Plin"], ["transferencia", "Transferencia"], ["deposito", "Depósito"], ["efectivo", "Efectivo"]];
const EMPTY = { zone: "emprendedor", nombre: "", dni: "", telefono: "", correo: "", comprobante: "boleta", ruc: "", razonSocial: "", metodoPago: "yape", referencia: "", pagoRecibido: false, banco: "", fechaPago: "", montoPagado: "", tipoVenta: "total" };
const AB_EMPTY = { montoPagado: "", metodoPago: "yape", referencia: "", fechaPago: "", banco: "", pagoRecibido: false };
const MAX_MB = 5;
const STATUS = { awaiting_terms: "Esperando T&C", in_review: "En revisión de contabilidad", separated: "Separada", paid: "Entrada emitida", cancelled: "Anulada", expired: "Vencida" };

export default function Asesor() {
  const [auth, setAuth] = useState({ code: "", pin: "" });
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const [abFor, setAbFor] = useState(null); // venta separada a la que se registra un abono
  const [ab, setAb] = useState(AB_EMPTY);
  const [abFile, setAbFile] = useState(null);
  const [abMsg, setAbMsg] = useState("");
  async function sendAbono(e) {
    e.preventDefault(); setAbMsg(""); setBusy(true);
    try {
      const fd = new FormData();
      Object.entries({ ...ab, code: abFor.code }).forEach(([k, v]) => fd.append(k, String(v)));
      if (abFile) fd.append("voucher", abFile);
      const r = await fetch("/api/asesor/abonos", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      setAbMsg(d.status === "paid" ? "✔ Pago completo: el sistema envía la entrada con QR al cliente." : `✔ Abono registrado. Saldo pendiente: S/ ${d.saldo}`);
      setAb(AB_EMPTY); setAbFile(null); refresh();
    } catch (ex) { setAbMsg(ex.message); } finally { setBusy(false); }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function call(body) {
    const r = await fetch("/api/asesor/ventas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Error");
    return d;
  }
  // Al abrir o recargar: si la sesión (cookie) sigue vigente, entra directo
  useEffect(() => { call({ list: true }).then((d) => { setMe(d.advisor); setOrders(d.orders); }).catch(() => {}); }, []);
  async function login(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/asesor/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(auth) });
      const s = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(s.error || "Error");
      setAuth({ code: "", pin: "" });
      const d = await call({ list: true }); setMe(d.advisor); setOrders(d.orders);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  async function logout() { await fetch("/api/asesor/session", { method: "DELETE" }); setMe(null); setOrders([]); }
  async function refresh() { try { const d = await call({ list: true }); setOrders(d.orders); } catch {} }
  const [file, setFile] = useState(null);
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true); setLast(null);
    try {
      if (file && file.size > MAX_MB * 1024 * 1024) throw new Error(`El comprobante pesa más de ${MAX_MB} MB.`);
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, String(v)));
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
      <p className="note">Tu link para ventas online (el cliente paga con Mercado Pago): <b>{me.link}</b></p>

      <form onSubmit={submit} className="advisor-form">
        <div className="field"><label>Tipo de venta</label>
          <select value={f.tipoVenta} onChange={set("tipoVenta")}>
            <option value="total">Pago completo</option>
            <option value="separacion">Separación (pago parcial; el saldo se completa con abonos)</option>
          </select></div>
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
          <div className="field"><label>{f.tipoVenta === "separacion" ? "Monto de la separación (S/)" : "Monto pagado (S/)"}</label><input required inputMode="decimal" value={f.montoPagado} onChange={set("montoPagado")} placeholder={f.tipoVenta === "separacion" ? "Ej. 50" : `${currentPrice(ZONES.find((z) => z.id === f.zone))}`} /></div>
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
        <label className="check"><input type="checkbox" checked={f.pagoRecibido} onChange={set("pagoRecibido")} /><span>{f.tipoVenta === "separacion" ? "Confirmo que ya recibí este pago de separación." : "Confirmo que ya recibí el pago completo del cliente."}</span></label>
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
          <thead><tr><th>Código</th><th>Zona</th><th>Cliente</th><th>S/</th><th>Pagado / saldo</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.code}>
                <td><b>{o.code}</b><br /><small>{o.opNumber ? `Op. ${o.opNumber}` : ""}</small></td><td>{o.zone}</td><td>{o.nombre}<br /><small>{o.telefono}</small></td><td>{o.price}</td>
                <td><small>{o.saleKind === "separacion" ? <>S/ {o.paid} pagado<br /><b>Saldo S/ {o.saldo}</b></> : "Completo"}</small></td>
                <td><span className={`st st-${o.status}`}>{STATUS[o.status] || o.status}</span></td>
                <td className="acts">
                  {o.status === "awaiting_terms" && <><a href={wa(o)} target="_blank" rel="noreferrer"><button>Reenviar</button></a><button onClick={() => copy(o.acceptUrl)}>Copiar link</button></>}
                  {o.status === "separated" && <button onClick={() => { setAbFor(o); setAbMsg(""); setAb({ ...AB_EMPTY, montoPagado: String(o.saldo) }); }}>Registrar abono</button>}
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan="7" style={{ textAlign: "center", color: "var(--mute)" }}>Aún no registras ventas</td></tr>}
          </tbody>
        </table>
      </div>
      <p><button className="btn ghost" onClick={refresh}>Actualizar</button> <button className="btn ghost" onClick={logout}>Salir</button></p>

      {abFor && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setAbFor(null)}>
          <form className="modal" onSubmit={sendAbono} data-lenis-prevent>
            <button type="button" className="close" onClick={() => setAbFor(null)} aria-label="Cerrar">×</button>
            <h3>Abono · {abFor.code}</h3>
            <p className="sub">{abFor.nombre} · pagado S/ {abFor.paid} · saldo <b>S/ {abFor.saldo}</b>. Al completar el total, el sistema envía la entrada con QR.</p>
            <div className="row2">
              <div className="field"><label>Monto del abono (S/)</label><input required inputMode="decimal" value={ab.montoPagado} onChange={(e) => setAb({ ...ab, montoPagado: e.target.value })} /></div>
              <div className="field"><label>Cómo pagó</label><select value={ab.metodoPago} onChange={(e) => setAb({ ...ab, metodoPago: e.target.value })}>{METODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <div className="row2">
              <div className="field"><label>N.º de operación</label><input value={ab.referencia} required={ab.metodoPago !== "efectivo"} onChange={(e) => setAb({ ...ab, referencia: e.target.value })} /></div>
              <div className="field"><label>Fecha del pago</label><input type="date" required value={ab.fechaPago} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setAb({ ...ab, fechaPago: e.target.value })} /></div>
            </div>
            <div className="field"><label>Foto del voucher {ab.metodoPago === "efectivo" ? "(opcional)" : "(obligatoria)"}</label><input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setAbFile(e.target.files?.[0] || null)} /></div>
            <label className="check"><input type="checkbox" checked={ab.pagoRecibido} onChange={(e) => setAb({ ...ab, pagoRecibido: e.target.checked })} /><span>Confirmo que ya recibí este abono.</span></label>
            {abMsg && <p className={abMsg.startsWith("✔") ? "note" : "err"}>{abMsg}</p>}
            <button className="btn" style={{ width: "100%", justifyContent: "space-between", marginTop: 14 }} disabled={busy}>{busy ? "Registrando…" : "Registrar abono"} <span aria-hidden>→</span></button>
          </form>
        </div>
      )}
    </main>
  );
}
