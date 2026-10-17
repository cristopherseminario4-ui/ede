import PageHead from "@/components/PageHead";
import { EVENT, STANDS } from "@/lib/config";

export const metadata = { title: "Stands · EDE 2.0" };
const money = (n) => `S/ ${n.toLocaleString("es-PE")}`;

export default function Stands() {
  const wa = `https://wa.me/${EVENT.whatsappGeneral}?text=${encodeURIComponent("Hola, quiero información sobre los stands del EDE 2.0")}`;
  return (
    <main>
      <PageHead eyebrow="Marcas aliadas" title={<>Exhibición <em className="serif">comercial.</em></>}>
        Pon tu marca frente a cientos de emprendedores durante el evento. Elige el paquete que mejor encaja con tu objetivo.
      </PageHead>
      <section className="stands tight">
        <div className="wrap">
          <div className="stands-grid" data-reveal="stagger">
            {STANDS.map((s) => (
              <article className="stand" key={s.name} style={{ "--c": s.color }} data-tilt>
                <span className="zone">{s.name}</span>
                <span className="days">{s.tag}</span>
                <b className="stand-price">{money(s.price)}</b>
                <ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </article>
            ))}
          </div>
          <p className="note" data-reveal>Los stands se coordinan con un asesor. Disponibilidad sujeta a confirmación.</p>
          <a className="btn" href={wa} target="_blank" rel="noreferrer" data-magnetic>Hablar con un asesor <span aria-hidden>→</span></a>
        </div>
      </section>
    </main>
  );
}
