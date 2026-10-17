import PageHead from "@/components/PageHead";
import { EVENT } from "@/lib/config";

export const metadata = { title: "Preguntas frecuentes · EDE 2.0" };

const FAQ = [
  ["¿Cómo ingreso al evento?", "Presenta tu documento (DNI, carné de extranjería o pasaporte) y tu código de pedido EDE26-XXXX o su QR. El nombre del documento debe coincidir con el del titular registrado. Cada código permite un solo ingreso por día."],
  ["¿Qué medios de pago aceptan?", "En la web pagas con Mercado Pago. Los precios están en soles e incluyen IGV; si algún medio tuviera un cargo adicional, se informa antes de confirmar."],
  ["¿Puedo ceder mi entrada a otra persona?", "Sí, sin costo y una sola vez, hasta 48 horas antes del evento. Escribe al WhatsApp oficial con tu código de pedido y el nombre y DNI del nuevo titular. Está prohibido revender entradas."],
  ["¿Los niños pagan entrada?", "Los menores de hasta 5 años ingresan sin costo. Para menores entre 6 y 13 años, consúltanos por WhatsApp antes de comprar."],
  ["¿Qué pasa si no puedo asistir?", "Si decides no asistir no hay devolución, pero puedes ceder tu entrada. Si tuviste un pago duplicado o un cobro en exceso, se te devuelve el monto de más."],
  ["¿Emiten boleta o factura?", "Sí. Elige al comprar. Para factura indica tu RUC y razón social antes de pagar: no se cambia una boleta por factura una vez emitida."],
  ["¿Hasta qué hora es el día 2?", "El Full Day del domingo 15 va de 9:00 am a 9:00 pm. Los horarios del sábado 14 se publicarán en los canales oficiales."],
  ["¿El evento garantiza resultados?", "No. Es un evento formativo, motivacional y de networking; no se garantizan ingresos ni resultados económicos. Los testimonios son experiencias individuales."],
  ["¿Cómo hago un reclamo?", "Mediante el Libro de Reclamaciones virtual de esta web y el físico en el local del evento. Los reclamos se responden en un máximo de 15 días hábiles."],
];

export default function Faq() {
  return (
    <main>
      <PageHead eyebrow="Preguntas frecuentes" title={<>Todo lo que <em className="serif">necesitas saber.</em></>} />
      <section className="faq">
        <div className="wrap narrow-wrap">
          <div data-reveal="stagger">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary data-hover><span>{q}</span><i aria-hidden>+</i></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <p className="fine" data-reveal>
            ¿Otra duda? Escríbenos por <a href={`https://wa.me/${EVENT.whatsappVip}`}>WhatsApp</a> o a <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
