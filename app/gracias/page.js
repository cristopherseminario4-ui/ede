import QRCode from "qrcode";
import { getOrderByToken } from "@/lib/orders";
import { ZONES } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tu entrada · EDE 2.0" };

export default async function Gracias({ searchParams }) {
  const sp = await searchParams;
  const order = sp.t ? getOrderByToken(String(sp.t)) : null;
  const zone = order && ZONES.find((z) => z.id === order.zone);
  const demo = sp.demo === "1" || order?.status === "paid-demo";
  const paid = order && (order.status === "paid" || order.status === "paid-demo");
  const qr = order ? await QRCode.toString(order.code, { type: "svg", margin: 1, width: 220, color: { dark: "#0a0612", light: "#ffffff" } }) : null;

  return (
    <main className="page narrow">
      {order ? (
        <>
          {demo && <div className="pill">Modo demo · pago simulado, no se cobró nada</div>}
          <p className="eyebrow">{paid ? "Pago confirmado" : "Pago pendiente de confirmación"}</p>
          <h1>{paid ? "Ya eres parte." : "Estamos esperando tu pago."}</h1>
          <div className="pass" style={{ "--c": zone?.color }}>
            <div className="pass-main">
              <span className="zone">Zona {zone?.name}</span>
              <div className="ticket-code">{order.code}</div>
              <dl>
                <div><dt>Titular</dt><dd>{order.nombre}</dd></div>
                <div><dt>Documento</dt><dd>{"•".repeat(Math.max(0, order.dni.length - 3)) + order.dni.slice(-3)}</dd></div>
                <div><dt>Días</dt><dd>{zone?.days}</dd></div>
                <div><dt>Total</dt><dd>S/ {order.price}</dd></div>
              </dl>
            </div>
            <div className="pass-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label={`Código QR ${order.code}`} />
          </div>
          <p>Guarda este comprobante. En puerta presenta tu documento. {order.syncStatus === "ok" ? `Tu entrada oficial con QR de ingreso fue enviada a ${order.correo} y a tu WhatsApp.` : `Enviaremos tu entrada oficial con QR de ingreso a ${order.correo}.`}</p>
        </>
      ) : (
        <>
          <h1>No encontramos tu pedido.</h1>
          <p>Si ya pagaste, escríbenos por WhatsApp con tu comprobante.</p>
        </>
      )}
      {order.docToken && <p><a className="btn" href={`/c/${order.docToken}`} target="_blank" rel="noreferrer">Descargar mi comprobante {order.docNumber} <span aria-hidden>→</span></a></p>}
      <p><a className="btn ghost" href="/">← Volver al inicio</a></p>
    </main>
  );
}
