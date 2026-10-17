import { EVENT } from "@/lib/config";
import ReclamoForm from "./ReclamoForm";

export const metadata = { title: "Libro de Reclamaciones · EDE 2.0", description: "Libro de Reclamaciones virtual de El Despertar del Emprendedor S.A.C." };

export default function Reclamaciones() {
  return (
    <main className="page narrow">
      <p className="eyebrow">Libro de Reclamaciones</p>
      <h1>Hoja de Reclamación</h1>
      <p className="lead">
        <b>EL DESPERTAR DEL EMPRENDEDOR S.A.C.</b> · RUC {EVENT.ruc}<br />
        Calle Mayor Luis García Rojas N.° 181, Urb. Alexander von Humboldt, Miraflores, Lima.
      </p>
      <p className="note">
        <b>Reclamo:</b> disconformidad con los productos o servicios. <b>Queja:</b> malestar o descontento con la atención al público.
        Responderemos en un plazo máximo de 15 días hábiles, a tu correo.
      </p>
      <ReclamoForm />
      <p className="note">
        La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante INDECOPI.
      </p>
    </main>
  );
}
