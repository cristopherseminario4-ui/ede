export default function Days() {
  return (
    <div className="days-grid" data-reveal="stagger">
      <article className="day">
        <span className="day-n">01</span>
        <p className="day-sub">Sábado 14 · Hacienda D'Paso</p>
        <h3>Día de <em className="serif">inmersión</em></h3>
        <p className="day-for">Zonas VIP y Empresarial</p>
        <ul>
          <li>Almuerzo con Vitmer Hilario</li>
          <li>Show musical de danzas regionales</li>
          <li>Show de caballos de paso</li>
          <li>Inmersión en hielo y networking empresarial</li>
        </ul>
        <div className="day-media"><video src="/video/hielo.mp4" autoPlay muted loop playsInline preload="metadata" aria-hidden /></div>
      </article>

      <article className="day day2">
        <span className="day-n">02</span>
        <p className="day-sub">Domingo 15 · Lima</p>
        <h3>Full Day</h3>
        <p className="day-for">Todas las zonas</p>
        <div className="clock">
          <div className="clock-times"><b>09:00</b><span aria-hidden>→</span><b>21:00</b></div>
          <div className="clock-bar"><i data-fill /></div>
          <p className="clock-cap"><b data-count="12">12</b> horas de conferencia, experiencia y networking</p>
        </div>
        <ul>
          <li>Conferencia con los siete ponentes</li>
          <li>Experiencia Full Day y kit de bienvenida</li>
          <li>Networking con cientos de emprendedores</li>
        </ul>
      </article>
    </div>
  );
}
