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
        <li>La entrada es personal y se valida en puerta con documento y código de pedido (EDE26-XXXX).</li>
        <li>Los precios están en soles e incluyen IGV. Se venden por etapas: preventa, regular y puerta.</li>
        <li>El evento es formativo y motivacional; no se garantizan resultados económicos.</li>
        <li>Existe Libro de Reclamaciones y los reclamos se responden en un máximo de 15 días hábiles.</li>
      </ul>
      <p style={{ color: "var(--mute)", fontSize: "0.8rem" }}>
        Este resumen es referencial. En caso de diferencia prevalece el documento completo.
      </p>
    </main>
  );
}
