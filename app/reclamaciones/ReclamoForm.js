"use client";
import { useState } from "react";

const EMPTY = { tipo: "reclamo", nombre: "", docTipo: "DNI", docNum: "", domicilio: "", telefono: "", correo: "", menor: false, tutor: "", bien: "servicio", monto: "", descBien: "Entrada El Despertar del Emprendedor 2.0", detalle: "", pedido: "", acepta: false };

export default function ReclamoForm() {
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/reclamaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo enviar");
      setDone(d);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  if (done)
    return (
      <div className="advisor-last">
        <p className="eyebrow">Recibido</p>
        <h2 style={{ margin: "6px 0 12px", fontWeight: 300 }}>Tu hoja es la {done.numero}</h2>
        <p>Guarda este número. Te responderemos en un máximo de 15 días hábiles al correo que indicaste.{done.correoEnviado ? " Te enviamos una copia a tu correo." : ""}</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="advisor-form" style={{ maxWidth: "none" }}>
      <h3 className="rec-h">1 · Identificación del consumidor</h3>
      <div className="field"><label>Nombre completo</label><input required value={f.nombre} onChange={set("nombre")} autoComplete="name" /></div>
      <div className="row2">
        <div className="field"><label>Documento</label><select value={f.docTipo} onChange={set("docTipo")}><option>DNI</option><option>CE</option><option>PASAPORTE</option><option>RUC</option></select></div>
        <div className="field"><label>N.° de documento</label><input required value={f.docNum} onChange={set("docNum")} /></div>
      </div>
      <div className="field"><label>Domicilio</label><input required value={f.domicilio} onChange={set("domicilio")} autoComplete="street-address" /></div>
      <div className="row2">
        <div className="field"><label>Teléfono</label><input required value={f.telefono} onChange={set("telefono")} inputMode="tel" /></div>
        <div className="field"><label>Correo</label><input required type="email" value={f.correo} onChange={set("correo")} /></div>
      </div>
      <label className="check"><input type="checkbox" checked={f.menor} onChange={set("menor")} /><span>Soy menor de edad (completa los datos de tu padre, madre o representante).</span></label>
      {f.menor && <div className="field"><label>Nombre del padre, madre o representante</label><input required value={f.tutor} onChange={set("tutor")} /></div>}

      <h3 className="rec-h">2 · Identificación del bien contratado</h3>
      <div className="row2">
        <div className="field"><label>Tipo</label><select value={f.bien} onChange={set("bien")}><option value="servicio">Servicio</option><option value="producto">Producto</option></select></div>
        <div className="field"><label>Monto reclamado (S/, opcional)</label><input value={f.monto} onChange={set("monto")} inputMode="decimal" /></div>
      </div>
      <div className="field"><label>Descripción</label><input required value={f.descBien} onChange={set("descBien")} /></div>

      <h3 className="rec-h">3 · Detalle de la reclamación</h3>
      <div className="field"><label>Es un…</label>
        <select value={f.tipo} onChange={set("tipo")}><option value="reclamo">Reclamo (producto o servicio)</option><option value="queja">Queja (atención al público)</option></select></div>
      <div className="field"><label>Detalle: ¿qué ocurrió?</label><textarea required rows="5" value={f.detalle} onChange={set("detalle")} /></div>
      <div className="field"><label>Pedido del consumidor: ¿qué solicitas?</label><textarea required rows="3" value={f.pedido} onChange={set("pedido")} /></div>

      <label className="check"><input type="checkbox" checked={f.acepta} onChange={set("acepta")} /><span>Declaro que los datos son ciertos y que he leído la <a href="/privacidad" target="_blank">Política de Privacidad</a>.</span></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Enviando…" : "Enviar hoja de reclamación"} <span aria-hidden>→</span></button>
    </form>
  );
}
