import { getOrderByAcceptToken } from "@/lib/orders";
import { ZONES, EVENT } from "@/lib/config";
import AcceptForm from "./AcceptForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirma tu entrada · EDE 2.0", robots: { index: false, follow: false } };

export default async function Aceptar({ params }) {
  const { token } = await params;
  const order = getOrderByAcceptToken(token);
  const zone = order && ZONES.find((z) => z.id === order.zone);

  if (!order || order.status === "cancelled")
    return (
      <main className="page narrow">
        <h1>Este link no es válido.</h1>
        <p>Pídele a tu asesor que te envíe uno nuevo.</p>
      </main>
    );

  const done = ["paid", "in_review", "separated"].includes(order.status);
  return (
    <main className="page narrow">
      <p className="eyebrow">{done ? "Entrada confirmada" : "Último paso"}</p>
      <h1>{done ? "Ya aceptaste." : "Confirma tus datos y acepta los términos."}</h1>
      <div className="pass" style={{ "--c": zone?.color }}>
        <div className="pass-main">
          <span className="zone">Zona {zone?.name}</span>
          <div className="ticket-code">{order.code}</div>
          <dl>
            <div><dt>Titular</dt><dd>{order.nombre}</dd></div>
            <div><dt>Documento</dt><dd>{"•".repeat(Math.max(0, order.dni.length - 3)) + order.dni.slice(-3)}</dd></div>
            <div><dt>Días</dt><dd>{zone?.days}</dd></div>
            <div><dt>Pagado</dt><dd>S/ {order.price}</dd></div>
            {order.advisorName && <div><dt>Asesor</dt><dd>{order.advisorName}</dd></div>}
          </dl>
        </div>
      </div>
      <AcceptForm token={token} done={done} terms={EVENT.termsVersion} />
    </main>
  );
}
