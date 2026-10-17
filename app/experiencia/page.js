import PageHead from "@/components/PageHead";
import Days from "@/components/Days";

export const metadata = { title: "Experiencia · EDE 2.0" };

export default function Experiencia() {
  return (
    <main>
      <PageHead eyebrow="La experiencia" title={<>Dos días. <em className="serif">Dos energías.</em></>}>
        El sábado para quienes buscan una inmersión; el domingo para todos. Los horarios del día 1 y el programa detallado se publicarán en los canales oficiales.
      </PageHead>
      <section className="days tight">
        <div className="wrap"><Days /></div>
      </section>

      <section className="place">
        <div className="wrap">
          <p className="eyebrow" data-reveal>El lugar</p>
          <h2 className="big" data-split>Un auditorio. <em className="serif">Tres niveles.</em></h2>
          <figure className="plan-full" data-reveal>
            <img src="/img/plano.jpg" alt="Plano referencial del auditorio" />
            <figcaption>Plano referencial del auditorio. La ubicación exacta de cada zona se confirmará en los canales oficiales.</figcaption>
          </figure>
          <p className="fine" data-reveal>Día 1: Hacienda D'Paso (dirección por confirmar). Día 2: Lima (local y dirección por confirmar).</p>
        </div>
      </section>

      <section className="final small">
        <div className="wrap">
          <p className="big" data-split>Elige cómo <em className="serif">vivirlo.</em></p>
          <a className="btn" href="/entradas" data-magnetic>Ver entradas <span aria-hidden>→</span></a>
        </div>
      </section>
    </main>
  );
}
