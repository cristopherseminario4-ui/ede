"use client";
import { useEffect, useState } from "react";
import { EVENT, ZONES, currentPrice, inPresale } from "@/lib/config";

const money = (n) => `S/ ${n.toLocaleString("es-PE")}`;

/* ───── Mapa de zonas (abanico frente al escenario) ───── */
const CX = 300, CY = 12;
const pt = (r, deg) => [CX + r * Math.cos((deg * Math.PI) / 180), CY + r * Math.sin((deg * Math.PI) / 180)];
function band(r1, r2, a0 = 18, a1 = 162) {
  const [x1, y1] = pt(r2, a0), [x2, y2] = pt(r2, a1), [x3, y3] = pt(r1, a1), [x4, y4] = pt(r1, a0);
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`;
}
const BANDS = { empresarial: [92, 128], vip: [136, 182], emprendedor: [190, 252] };

function ZoneMap({ hot, onHot }) {
  return (
    <svg className="zmap" viewBox="0 0 600 282" role="img" aria-label="Distribución de zonas frente al escenario">
      <path d={band(0, 70)} className="stage" />
      <text x={CX} y={CY + 42} textAnchor="middle" className="zlabel stagelabel">ESCENARIO</text>
      {ZONES.map((z) => {
        const [r1, r2] = BANDS[z.id];
        return (
          <g key={z.id} onMouseEnter={() => onHot(z.id)} onMouseLeave={() => onHot(null)} className={`zband ${hot === z.id ? "on" : hot ? "dim" : ""}`} style={{ "--c": z.color }}>
            <path d={band(r1, r2)} />
            <text x={CX} y={CY + (r1 + r2) / 2 + 4} textAnchor="middle" className="zlabel">{z.name.toUpperCase()}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CheckoutModal({ zone, onClose }) {
  const [f, setF] = useState({ nombre: "", dni: "", telefono: "", correo: "", comprobante: "boleta", ruc: "", razonSocial: "", acepta: false });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    window.__lenis?.stop();
    return () => { window.removeEventListener("keydown", esc); window.__lenis?.start(); };
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, zone: zone.id, advisor: (() => { try { return localStorage.getItem("ede_asesor") || ""; } catch { return ""; } })() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al procesar");
      window.location.href = d.url;
    } catch (ex) {
      setErr(ex.message); setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} style={{ "--c": zone.color }} data-lenis-prevent>
        <button type="button" className="close" onClick={onClose} aria-label="Cerrar">×</button>
        <span className="zone-chip">Zona {zone.name}</span>
        <h3>Tu entrada</h3>
        <p className="sub">{zone.days} · La entrada es personal: se registra a nombre del asistente.</p>

        <div className="field"><label>Nombre completo</label><input required value={f.nombre} onChange={set("nombre")} autoComplete="name" /></div>
        <div className="row2">
          <div className="field"><label>DNI / documento</label><input required value={f.dni} onChange={set("dni")} inputMode="numeric" /></div>
          <div className="field"><label>Teléfono / WhatsApp</label><input required value={f.telefono} onChange={set("telefono")} inputMode="tel" autoComplete="tel" /></div>
        </div>
        <div className="field"><label>Correo</label><input required type="email" value={f.correo} onChange={set("correo")} autoComplete="email" /></div>
        <div className="field">
          <label>Comprobante</label>
          <select value={f.comprobante} onChange={set("comprobante")}>
            <option value="boleta">Boleta</option>
            <option value="factura">Factura</option>
          </select>
        </div>
        {f.comprobante === "factura" && (
          <div className="row2">
            <div className="field"><label>RUC</label><input value={f.ruc} onChange={set("ruc")} inputMode="numeric" /></div>
            <div className="field"><label>Razón social</label><input value={f.razonSocial} onChange={set("razonSocial")} /></div>
          </div>
        )}

        <label className="check">
          <input type="checkbox" checked={f.acepta} onChange={set("acepta")} />
          <span>Leí y acepto los <a href="/terminos" target="_blank">Términos y Condiciones</a> ({EVENT.termsVersion}) y la <a href="/privacidad" target="_blank">Política de Privacidad</a>.</span>
        </label>

        {err && <p className="err" role="alert">{err}</p>}
        <div className="total"><span className="eyebrow">Total</span><b>{money(currentPrice(zone))}</b></div>
        <button className="btn" style={{ width: "100%", justifyContent: "space-between", marginTop: 18 }} disabled={busy}>
          {busy ? "Procesando…" : "Pagar con Mercado Pago"} <span aria-hidden>→</span>
        </button>
        <p className="pay-note">El precio incluye IGV. Serás redirigido a Mercado Pago para completar el pago de forma segura.</p>
      </form>
    </div>
  );
}

export default function Tickets({ showMap = true }) {
  const [open, setOpen] = useState(null);
  const [hot, setHot] = useState(null);
  const [avail, setAvail] = useState(null);
  const presale = inPresale();

  useEffect(() => {
    fetch("/api/availability").then((r) => r.json()).then(setAvail).catch(() => {});
  }, []);

  return (
    <section className="tickets" id="entradas">
      <div className="wrap">
        <p className="eyebrow" data-reveal>Entradas</p>
        <h2 className="big" data-split>Elige tu <em className="serif">lugar</em>.</h2>
        {showMap && <div data-reveal><ZoneMap hot={hot} onHot={setHot} /></div>}
        <div className="tickets-grid" data-reveal="stagger">
          {ZONES.map((z) => {
            const left = avail?.[z.id]?.left;
            const sold = left === 0;
            return (
              <div className="ticket-slot" key={z.id}>
              <article
                className={`ticket ${hot === z.id ? "hot" : ""} ${z.id === "vip" ? "featured" : ""}`}
                style={{ "--c": z.color }}
                data-tilt
                onMouseEnter={() => setHot(z.id)}
                onMouseLeave={() => setHot(null)}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
              >
                {z.id === "vip" && <span className="ribbon">Más elegido</span>}
                <span className="zone">Zona {z.name}</span>
                <span className="days">{z.days}</span>
                <div className="price">
                  <small>{presale ? "Preventa" : "Precio regular"}</small>
                  <b>{money(currentPrice(z))}</b>
                  {presale && <s>{money(z.regular)}</s>}
                </div>
                <hr />
                <ul>{z.perks.map((p) => <li key={p}>{p}</li>)}</ul>
                <div className="meter" aria-hidden><i style={{ width: `${left == null ? 0 : Math.round(((z.seats - left) / z.seats) * 100)}%` }} /></div>
                <p className="seats">
                  {left == null ? `${z.seats} cupos` : sold ? "Agotado" : left <= 25 ? `¡Últimos ${left} cupos!` : `Quedan ${left} de ${z.seats} cupos`}
                </p>
                <button className="btn" onClick={() => setOpen(z)} disabled={sold} data-magnetic>{sold ? "Agotado" : "Comprar"} <span aria-hidden>→</span></button>
              </article>
              </div>
            );
          })}
        </div>
        <p className="note" data-reveal>
          Menores de hasta 5 años ingresan sin costo. *El Programa de Bancarización es un servicio de acompañamiento: el monto es referencial,
          no garantizado, y sujeto a evaluación de la entidad financiera. ¿Dudas? Escríbenos por{" "}
          <a href={`https://wa.me/${EVENT.whatsappVip}`} target="_blank" rel="noreferrer">WhatsApp</a>.
        </p>
      </div>
      {open && <CheckoutModal zone={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
