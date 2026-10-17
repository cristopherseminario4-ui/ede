import { EVENT } from "@/lib/config";

export const metadata = { title: "Política de Privacidad · EDE 2.0" };

export default function Privacidad() {
  return (
    <main className="page narrow">
      <p className="eyebrow">Legal</p>
      <h1>Política de Privacidad</h1>
      <p className="note">Texto base elaborado a partir de los datos que recoge esta web. Debe ser revisado por el asesor legal de la empresa antes de la publicación oficial.</p>

      <h2 className="rec-h">Quién trata tus datos</h2>
      <p>EL DESPERTAR DEL EMPRENDEDOR S.A.C. (RUC {EVENT.ruc}), parte de Hilario GRP, con domicilio en Calle Mayor Luis García Rojas N.° 181, Urb. Alexander von Humboldt, Miraflores, Lima. Contacto: <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>.</p>

      <h2 className="rec-h">Qué datos recogemos y para qué</h2>
      <ul>
        <li><b>Datos de la entrada:</b> nombre, documento de identidad, teléfono y correo. Para emitir tu entrada personal, enviártela, validar tu ingreso y atender consultas.</li>
        <li><b>Datos de facturación:</b> RUC y razón social si pides factura. Para emitir tu comprobante de pago.</li>
        <li><b>Datos del pago:</b> el pago se procesa en Mercado Pago, que trata los datos de tu tarjeta bajo su propia política. Nosotros no almacenamos tu tarjeta. Si pagas a un asesor, guardamos el número de operación, la fecha, el monto y la foto del voucher para verificar el pago.</li>
        <li><b>Aceptación de términos:</b> guardamos la versión aceptada, la fecha, la hora y tu dirección IP como prueba.</li>
        <li><b>Libro de Reclamaciones:</b> los datos que escribas en la hoja, para atender tu reclamo.</li>
      </ul>

      <h2 className="rec-h">Con quién los compartimos</h2>
      <p>Con los proveedores necesarios para prestar el servicio: la pasarela de pago, los servicios de envío de correo y mensajería, y el sistema de control de ingreso del evento. No vendemos tus datos.</p>

      <h2 className="rec-h">Cuánto tiempo los conservamos</h2>
      <p>El tiempo necesario para cumplir las finalidades descritas y las obligaciones tributarias y de atención de reclamos que correspondan.</p>

      <h2 className="rec-h">Tus derechos</h2>
      <p>Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos escribiendo a <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a> con tu nombre y documento. Si consideras que no atendimos tu solicitud, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</p>

      <h2 className="rec-h">Menores de edad</h2>
      <p>Los menores de hasta 5 años ingresan sin costo acompañados de un adulto responsable. Para menores de 6 a 13 años, consulta por WhatsApp.</p>
    </main>
  );
}
