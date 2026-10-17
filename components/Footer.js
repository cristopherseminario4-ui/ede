import Link from "next/link";
import { EVENT } from "@/lib/config";

export default function Footer() {
  return (
    <footer>
      <div className="foot-top">
        <img src="/img/logo-ede-2026.png" alt="El Despertar del Emprendedor 2026" />
        <Link className="btn" href="/entradas" data-magnetic>Asegurar mi entrada <span aria-hidden>→</span></Link>
      </div>
      <div className="foot-grid">
        <div>
          <h4>Evento</h4>
          <p>14 y 15 de noviembre de 2026<br />{EVENT.city}</p>
        </div>
        <div>
          <h4>Explorar</h4>
          <Link href="/ponentes">Ponentes</Link>
          <Link href="/experiencia">Experiencia</Link>
          <Link href="/entradas">Entradas</Link>
          <Link href="/stands">Stands</Link>
          <Link href="/faq">Preguntas frecuentes</Link>
        </div>
        <div>
          <h4>Contacto</h4>
          <a href={`https://wa.me/${EVENT.whatsappVip}`}>WhatsApp · +51 936 080 473</a>
          <a href={`https://wa.me/${EVENT.whatsappGeneral}`}>Administrativo · +51 955 200 218</a>
          <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>
        </div>
        <div>
          <h4>Legal</h4>
          <Link href="/terminos">Términos y Condiciones</Link>
          <a href="#libro">Libro de Reclamaciones</a>
        </div>
      </div>
      <p className="legal" id="libro">
        EL DESPERTAR DEL EMPRENDEDOR S.A.C. · RUC {EVENT.ruc} · Calle Mayor Luis García Rojas N.° 181, Urb. Alexander von Humboldt, Miraflores, Lima.
        Parte de Hilario GRP. Evento formativo, motivacional y de networking: no se garantizan resultados económicos. Libro de Reclamaciones virtual: [POR IMPLEMENTAR].
      </p>
    </footer>
  );
}
