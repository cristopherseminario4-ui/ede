import { EVENT } from "@/lib/config";

export const metadata = { title: "Términos y Condiciones · EDE 2.0" };

export default function Terminos() {
  return (
    <main className="page narrow">
      <p className="eyebrow">Legal</p>
      <h1>Términos y Condiciones</h1>
      <p>Versión vigente: {EVENT.termsVersion}. Al comprar una entrada aceptas íntegramente estos términos.</p>
      <p>
        <a className="btn" href="/docs/terminos-v3.pdf" target="_blank">Ver documento completo (PDF) <span aria-hidden>→</span></a>
      </p>
      <h2 style={{ margin: "36px 0 12px", fontWeight: 400 }}>Lo esencial</h2>
      <ul>
        <li>La entrada es personal. Recibirás tu QR por correo y WhatsApp y se valida en puerta junto con tu documento.</li>
        <li>Los precios están en soles e incluyen IGV. Se venden por etapas: preventa y precio regular. Las tres zonas (Emprendedor, VIP y Empresarial) se compran en la web o con un asesor.</li>
        <li>Pagos en la web con Mercado Pago. Si pagas a un asesor (Yape, Plin, transferencia, depósito o efectivo), debes aceptar estos términos desde el link que te envía y contabilidad valida tu voucher; la entrada se emite al confirmar el pago.</li>
        <li>Menores de hasta 5 años ingresan sin costo. El día 2 se atiende de 9:00 a. m. a 9:00 p. m.</li>
        <li>Puedes ceder tu entrada hasta 48 horas antes del evento, comunicándolo por los canales oficiales.</li>
        <li>Devoluciones: hasta 15 días hábiles, descontando la comisión de la plataforma de pago. No hay devolución por inasistencia.</li>
        <li>El evento es formativo, motivacional y de networking; no se garantizan resultados económicos.</li>
        <li>Existe <a href="/reclamaciones">Libro de Reclamaciones</a> virtual y los reclamos se responden en un máximo de 15 días hábiles. Tus datos se tratan según la <a href="/privacidad">Política de Privacidad</a>.</li>
      </ul>
      <p style={{ color: "var(--mute)", fontSize: "0.8rem" }}>
        Este resumen es referencial. En caso de diferencia prevalece el documento completo.
      </p>
    </main>
  );
}
