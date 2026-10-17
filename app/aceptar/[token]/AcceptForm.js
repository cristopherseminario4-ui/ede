"use client";
import { useState } from "react";

export default function AcceptForm({ token, done, terms }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/aceptar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, acepta: ok }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo confirmar");
      setReview(true);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  if (done || review)
    return (
      <>
        <p>Tu aceptación quedó registrada. El área de contabilidad verificará tu pago y, apenas lo confirme, tu entrada oficial con QR llegará a tu correo y a tu WhatsApp.</p>
      </>
    );

  return (
    <form onSubmit={submit}>
      <p>Revisa que tus datos sean correctos. La entrada es personal y solo se emite cuando aceptas los Términos y Condiciones.</p>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>Leí y acepto los <a href="/terminos" target="_blank">Términos y Condiciones</a> ({terms}).</span>
      </label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={!ok || busy} style={{ marginTop: 18 }}>{busy ? "Confirmando…" : "Aceptar y recibir mi entrada"} <span aria-hidden>→</span></button>
    </form>
  );
}
