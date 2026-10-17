import PageHead from "@/components/PageHead";
import SpeakerShowcase from "@/components/SpeakerShowcase";
// (SpeakerSpotlight sigue en components/ como versión anterior)

export const metadata = { title: "Ponentes · EDE 2.0" };

export default function Ponentes() {
  return (
    <main>
      <PageHead eyebrow="Quiénes te hablan" title={<>Siete voces. <em className="serif">Una dirección.</em></>}>
        Elige a cada ponente y conoce su historia. Habrá más ponentes que se anunciarán en los canales oficiales.
      </PageHead>
      <section className="speakers">
        <div className="wrap"><SpeakerShowcase /></div>
      </section>
      <section className="final small">
        <div className="wrap">
          <p className="big" data-split>Escúchalos <em className="serif">en vivo.</em></p>
          <a className="btn" href="/entradas" data-magnetic>Asegurar mi entrada <span aria-hidden>→</span></a>
        </div>
      </section>
    </main>
  );
}
