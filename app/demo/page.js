"use client";
import { useState } from "react";
import { ZONES, currentPrice } from "@/lib/config";

// Demostración interactiva para gerencia: datos ficticios, nada se guarda ni se envía.
const TABS = [
  ["asesor", "1 · Asesor"],
  ["cliente", "2 · Cliente"],
  ["conta", "3 · Contabilidad"],
  ["admin", "4 · Administración"],
];
const STATUS = {
  awaiting_terms: ["Esperando T&C del cliente", "#f28a1a"],
  in_review: ["En revisión de contabilidad", "#b44dff"],
  paid: ["Pagado · entrada enviada", "#4ade80"],
};
const seed = [
  { code: "EDE26-K7QA", zone: "vip", nombre: "María Quispe Rojas", dni: "45123789", tel: "987 123 456", asesor: "Carlos R.", metodo: "Yape", op: "88213467", fecha: "2026-10-14", monto: 1000, banco: "Yape", status: "paid" },
  { code: "EDE26-M3TD", zone: "emprendedor", nombre: "José Huamán Díaz", dni: "70234561", tel: "955 321 098", asesor: "Lucía P.", metodo: "Transferencia", op: "00457712", fecha: "2026-10-15", monto: 150, banco: "BCP", status: "in_review" },
  { code: "EDE26-P9ZW", zone: "empresarial", nombre: "Inversiones Andes SAC", dni: "20601234", tel: "944 567 123", asesor: "Web · Mercado Pago", metodo: "Mercado Pago", op: "MP 1325578891", fecha: "2026-10-16", monto: 1999, banco: "Tarjeta", status: "paid" },
];
const money = (n) => `S/ ${n.toLocaleString("es-PE")}`;
const zoneOf = (id) => ZONES.find((z) => z.id === id);

function Voucher({ o }) {
  return (
    <svg viewBox="0 0 240 300" className="demo-voucher" role="img" aria-label={`Voucher de ejemplo, operación ${o.op}`}>
      <rect width="240" height="300" rx="10" fill="#f4f1fa" />
      <rect width="240" height="54" rx="10" fill="#6d28d9" />
      <text x="120" y="33" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">Pago realizado</text>
      <text x="120" y="96" textAnchor="middle" fill="#0a0612" fontSize="30" fontWeight="700">{money(o.monto)}</text>
      {[["N.º de operación", o.op], ["Fecha", o.fecha], ["Entidad", o.banco], ["Enviado por", o.nombre]].map(([k, v], i) => (
        <g key={k}><text x="20" y={140 + i * 36} fill="#6b6478" fontSize="10">{k}</text><text x="20" y={156 + i * 36} fill="#0a0612" fontSize="13" fontWeight="600">{v}</text></g>
      ))}
      <text x="120" y="288" textAnchor="middle" fill="#9a93a8" fontSize="9">EJEMPLO · DATOS FICTICIOS</text>
    </svg>
  );
}

const Pill = ({ s }) => <span className="demo-pill" style={{ "--c": STATUS[s][1] }}>{STATUS[s][0]}</span>;

export default function Demo() {
  const [tab, setTab] = useState("asesor");
  const [orders, setOrders] = useState(seed);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({ zone: "vip", nombre: "Rosa Mendoza Vega", dni: "46789012", tel: "999 888 777", metodo: "Yape", op: "91234567", fecha: new Date().toISOString().slice(0, 10), banco: "Yape" });
  const [ok, setOk] = useState(false);
  const [view, setView] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const update = (code, patch) => setOrders((os) => os.map((o) => (o.code === code ? { ...o, ...patch } : o)));
  const register = (e) => {
    e.preventDefault();
    const code = `EDE26-${Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01OI]/g, "X")}`;
    const o = { code, zone: form.zone, nombre: form.nombre, dni: form.dni, tel: form.tel, asesor: "Carlos R.", metodo: form.metodo, op: form.op, fecha: form.fecha, monto: currentPrice(zoneOf(form.zone)), banco: form.banco, status: "awaiting_terms" };
    setOrders([o, ...orders]); setSel(code); setOk(false); setTab("cliente");
  };
  const cur = orders.find((o) => o.code === sel);
  const pending = orders.filter((o) => o.status === "in_review");
  const totals = ZONES.map((z) => ({ z, n: orders.filter((o) => o.zone === z.id && o.status !== "awaiting_terms").length }));
  const revenue = orders.filter((o) => o.status === "paid").reduce((a, o) => a + o.monto, 0);

  return (
    <main className="page admin demo" data-lenis-prevent>
      <p className="eyebrow">Demostración · datos ficticios</p>
      <h1>Así funciona la venta por asesor</h1>
      <p className="lead">Recorre el proceso completo, de un tab al siguiente. Nada de lo que hagas aquí se guarda ni se envía a nadie.</p>

      <nav className="demo-tabs" aria-label="Pasos">
        {TABS.map(([id, label]) => <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === "asesor" && (
        <section className="demo-panel">
          <h2>Portal del asesor</h2>
          <p className="note">El asesor cobró por Yape, Plin, transferencia, depósito o efectivo. Registra la venta con el voucher y los datos de la operación.</p>
          <form onSubmit={register} className="advisor-form">
            <div className="row2">
              <div className="field"><label>Zona</label><select value={form.zone} onChange={set("zone")}>{ZONES.map((z) => <option key={z.id} value={z.id}>{z.name} · {money(currentPrice(z))}</option>)}</select></div>
              <div className="field"><label>Cómo pagó</label><select value={form.metodo} onChange={set("metodo")}>{["Yape", "Plin", "Transferencia", "Depósito", "Efectivo"].map((m) => <option key={m}>{m}</option>)}</select></div>
            </div>
            <div className="field"><label>Nombre completo del asistente</label><input value={form.nombre} onChange={set("nombre")} /></div>
            <div className="row2">
              <div className="field"><label>DNI</label><input value={form.dni} onChange={set("dni")} /></div>
              <div className="field"><label>WhatsApp</label><input value={form.tel} onChange={set("tel")} /></div>
            </div>
            <div className="row2">
              <div className="field"><label>N.º de operación (como sale en el voucher)</label><input value={form.op} onChange={set("op")} /></div>
              <div className="field"><label>Fecha del pago</label><input type="date" value={form.fecha} onChange={set("fecha")} /></div>
            </div>
            <div className="field"><label>Foto del voucher</label><div className="demo-file">📎 voucher-yape.jpg · adjunto de ejemplo</div></div>
            <label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>Confirmo que ya recibí el pago completo del cliente.</span></label>
            <button className="btn" disabled={!ok}>Registrar y generar link <span aria-hidden>→</span></button>
          </form>
          <ul className="demo-rules">
            <li>El voucher y el n.º de operación son obligatorios (salvo efectivo).</li>
            <li>El sistema rechaza un n.º de operación que ya se usó en otra venta.</li>
            <li>El monto debe coincidir con el precio de la zona.</li>
          </ul>
        </section>
      )}

      {tab === "cliente" && (
        <section className="demo-panel">
          <h2>El cliente acepta los Términos y Condiciones</h2>
          {!cur ? <p className="note">Primero registra una venta en el paso 1: el cliente recibe su link por WhatsApp.</p> : (
            <>
              <p className="note">Mensaje que recibe {cur.nombre.split(" ")[0]} por WhatsApp: «Hola, soy Carlos de EDE 2.0. Para emitir tu entrada confirma tus datos y acepta los Términos y Condiciones aquí: ede-evento.com/aceptar/…»</p>
              <div className="pass" style={{ "--c": zoneOf(cur.zone).color }}>
                <div className="pass-main">
                  <span className="zone">Zona {zoneOf(cur.zone).name}</span>
                  <div className="ticket-code">{cur.code}</div>
                  <dl>
                    <div><dt>Titular</dt><dd>{cur.nombre}</dd></div>
                    <div><dt>Documento</dt><dd>{cur.dni}</dd></div>
                    <div><dt>Días</dt><dd>{zoneOf(cur.zone).days}</dd></div>
                    <div><dt>Pagado</dt><dd>{money(cur.monto)}</dd></div>
                  </dl>
                </div>
              </div>
              {cur.status === "awaiting_terms" ? (
                <button className="btn" onClick={() => { update(cur.code, { status: "in_review" }); setTab("conta"); }}>Aceptar T&C y continuar <span aria-hidden>→</span></button>
              ) : <p><b>✔ Aceptación registrada</b> con versión de los T&C, fecha, hora e IP.</p>}
            </>
          )}
        </section>
      )}

      {tab === "conta" && (
        <section className="demo-panel">
          <h2>Contabilidad revisa el voucher</h2>
          <p className="note">Aparece en la lista del sistema de entradas con el ícono del comprobante. Compara el voucher con los datos de la venta y confirma el pago: recién ahí se envía la entrada con su QR.</p>
          {!pending.length && <p>No hay ventas pendientes de revisión. Registra una en el paso 1 y acepta como cliente en el paso 2.</p>}
          <div className="demo-cards">
            {pending.map((o) => (
              <article key={o.code} className="demo-card">
                <Voucher o={o} />
                <div>
                  <p className="eyebrow">{o.code} · Zona {zoneOf(o.zone).name}</p>
                  <h3>{o.nombre}</h3>
                  <dl className="demo-dl">
                    <div><dt>Asesor</dt><dd>{o.asesor}</dd></div>
                    <div><dt>Método</dt><dd>{o.metodo}</dd></div>
                    <div><dt>N.º de operación</dt><dd><b>{o.op}</b></dd></div>
                    <div><dt>Fecha de pago</dt><dd>{o.fecha}</dd></div>
                    <div><dt>Monto</dt><dd>{money(o.monto)}</dd></div>
                    <div><dt>T&C aceptados</dt><dd>✔ v3 · hoy</dd></div>
                  </dl>
                  <button className="btn" onClick={() => update(o.code, { status: "paid" })}>Confirmar pago y enviar entrada <span aria-hidden>→</span></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "admin" && (
        <section className="demo-panel">
          <h2>Panel de administración</h2>
          <div className="admin-stats">
            <div><b>{orders.length}</b><span>Pedidos</span></div>
            <div><b>{orders.filter((o) => o.status === "paid").length}</b><span>Pagados</span></div>
            <div><b>{money(revenue)}</b><span>Ingresos confirmados</span></div>
            <div><b>{pending.length}</b><span>En revisión</span></div>
            {totals.map(({ z, n }) => <div key={z.id}><b>{z.seats - n}</b><span>Libres · {z.name}</span></div>)}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Código</th><th>Zona</th><th>Titular</th><th>Origen</th><th>N.º operación</th><th>S/</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.code}>
                    <td><b>{o.code}</b></td><td>{zoneOf(o.zone).name}</td><td>{o.nombre}<br /><small>{o.dni}</small></td>
                    <td><small>{o.asesor}</small></td><td><b>{o.op}</b><br /><small>{o.fecha} · {o.banco}</small></td><td>{o.monto}</td>
                    <td><Pill s={o.status} /></td>
                    <td className="acts">{o.metodo !== "Mercado Pago" && <button onClick={() => setView(o)}>Ver voucher</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">Todo se puede filtrar, buscar por DNI y exportar a CSV con el n.º de operación, fecha, monto, entidad y asesor.</p>
        </section>
      )}

      {view && (
        <div className="overlay" onClick={() => setView(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <button type="button" className="close" onClick={() => setView(null)} aria-label="Cerrar">×</button>
            <Voucher o={view} />
          </div>
        </div>
      )}
    </main>
  );
}
