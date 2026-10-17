import Link from "next/link";
import Hero from "@/components/Hero";
import Tickets from "@/components/Tickets";
import Days from "@/components/Days";
import { ZONES } from "@/lib/config";

const MARQUEE = ["14 · 15 NOV 2026", "LIMA", "7 PONENTES", "900 CUPOS", "DOS DÍAS", "UNA DECISIÓN"];
const STATS = [
  { n: 7, label: "Ponentes" },
  { n: 2, label: "Días" },
  { n: ZONES.reduce((a, z) => a + z.seats, 0), label: "Cupos en total" },
  { n: 12, label: "Horas de Full Day" },
];

export default function Home() {
  return (
    <>
      <Hero />

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i}>{t}<i>◆</i></span>
          ))}
        </div>
      </div>

      <section className="words" data-words aria-label="Despierta. Decide. Construye.">
        <p className="eyebrow">Tres verbos</p>
        <div className="word-stack">
          <span className="word">Despierta<i>.</i></span>
          <span className="word">Decide<i>.</i></span>
          <span className="word">Construye<i>.</i></span>
        </div>
      </section>

      <section className="manifesto">
        <div className="wrap split">
          <div>
            <p className="eyebrow" data-reveal>El punto de partida</p>
            <p className="big" data-split>Nadie despierta <em className="serif">por accidente.</em></p>
            <p className="big dim" data-split>Se decide. En un sábado y un domingo, en Lima.</p>
            <p className="fine" data-reveal>
              Evento formativo, motivacional y de networking. No se garantizan ingresos ni resultados económicos; los testimonios son experiencias
              individuales. Las constancias acreditan solo la asistencia.
            </p>
          </div>
          <figure className="photo" data-reveal>
            <img data-parallax src="/img/publico.jpg" alt="Asistentes del Despertar del Emprendedor escuchando en sala" />
          </figure>
        </div>
      </section>

      <section className="stats">
        <div className="wrap stats-grid" data-reveal="stagger">
          {STATS.map((s) => (
            <div key={s.label}><b data-count={s.n}>{s.n}</b><span>{s.label}</span></div>
          ))}
        </div>
      </section>

      <section className="speakers-teaser">
        <div className="wrap">
          <p className="eyebrow" data-reveal>Quiénes te hablan</p>
          <figure className="poster" data-reveal>
            <img src="/img/ponentes.jpg" alt="Ponentes del evento" />
          </figure>
          <Link className="link-arrow" href="/ponentes" data-reveal>Conoce a los siete ponentes <span aria-hidden>→</span></Link>
        </div>
      </section>

      <section className="days" id="experiencia">
        <div className="wrap">
          <p className="eyebrow" data-reveal>La experiencia</p>
          <h2 className="big" data-split>Dos días. <em className="serif">Dos energías.</em></h2>
          <Days />
          <Link className="link-arrow" href="/experiencia" data-reveal>Ver toda la experiencia <span aria-hidden>→</span></Link>
        </div>
      </section>

      <Tickets />

      <section className="book">
        <div className="wrap split">
          <figure data-reveal><img src="/img/libro.jpg" alt="Libro El camino de la deuda vs. Camino al millón, de Vitmer Hilario" /></figure>
          <div>
            <p className="eyebrow" data-reveal>Incluido en VIP y Empresarial</p>
            <p className="big" data-split>Un libro, <em className="serif">firmado</em> para ti.</p>
            <p className="fine" data-reveal>El primer libro de Vitmer Hilario, autografiado: <em>El camino de la deuda vs. Camino al millón</em>.</p>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <p className="huge" data-split>Tu despertar <em className="serif">empieza</em> el 14.</p>
          <Link className="btn" href="/entradas" data-magnetic>Asegurar mi entrada <span aria-hidden>→</span></Link>
        </div>
      </section>
    </>
  );
}
