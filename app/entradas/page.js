import PageHead from "@/components/PageHead";
import Tickets from "@/components/Tickets";

export const metadata = { title: "Entradas · EDE 2.0" };

const STEPS = [
  ["01", "Elige tu zona", "Emprendedor, VIP o Empresarial. El precio de preventa es por tiempo y cupos limitados."],
  ["02", "Completa tus datos", "La entrada es personal: se registra a nombre del asistente, con su documento."],
  ["03", "Paga con Mercado Pago", "Pago seguro. Al confirmarse recibes tu código EDE26 y tu QR de ingreso."],
];

export default function Entradas() {
  return (
    <main>
      <PageHead eyebrow="Entradas" title={<>Tu lugar <em className="serif">te espera.</em></>}>
        Tres zonas, un solo día para decidir. Los cupos se cierran al agotarse.
      </PageHead>
      <Tickets />
      <section className="steps">
        <div className="wrap">
          <p className="eyebrow" data-reveal>Cómo comprar</p>
          <div className="steps-grid" data-reveal="stagger">
            {STEPS.map(([n, t, d]) => (
              <div key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
          <p className="fine" data-reveal>¿Prefieres que te asesoremos? <a href="/faq">Mira las preguntas frecuentes</a> o escríbenos por WhatsApp.</p>
        </div>
      </section>
    </main>
  );
}
