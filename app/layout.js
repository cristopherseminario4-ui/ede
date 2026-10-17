import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./v3.css";
import "./v4.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import Cursor from "@/components/Cursor";
import AdvisorRef from "@/components/AdvisorRef";
import { EVENT, ZONES, SPEAKERS } from "@/lib/config";

const eventLd = {
  "@context": "https://schema.org", "@type": "Event", name: EVENT.name,
  startDate: "2026-11-14", endDate: "2026-11-15", eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: { "@type": "Place", name: "Lima, Perú", address: { "@type": "PostalAddress", addressLocality: "Lima", addressCountry: "PE" } },
  organizer: { "@type": "Organization", name: "El Despertar del Emprendedor S.A.C.", taxID: EVENT.ruc, email: EVENT.email },
  performer: SPEAKERS.map((n) => ({ "@type": "Person", name: n })),
  offers: ZONES.map((z) => ({ "@type": "Offer", name: `Zona ${z.name}`, price: z.presale, priceCurrency: "PEN", availability: "https://schema.org/InStock", url: `${process.env.BASE_URL || "http://localhost:3100"}/entradas` })),
};

const sans = Montserrat({ subsets: ["latin"], variable: "--sans", weight: ["300", "400", "500", "700", "900"] });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--serif", style: ["italic"], weight: ["400"] });

const SITE = process.env.BASE_URL || "http://localhost:3100";
export const metadata = {
  metadataBase: new URL(SITE),
  openGraph: {
    type: "website", locale: "es_PE", siteName: "El Despertar del Emprendedor 2.0",
    title: "El Despertar del Emprendedor 2.0 · 14 y 15 de noviembre · Lima",
    description: "Dos días de formación, motivación y networking con 7 ponentes. Lima, 14 y 15 de noviembre de 2026.",
    images: [{ url: "/img/ponentes.jpg", width: 1920, height: 1080, alt: "Ponentes de El Despertar del Emprendedor 2.0" }],
  },
  twitter: { card: "summary_large_image", title: "El Despertar del Emprendedor 2.0", description: "14 y 15 de noviembre de 2026 · Lima", images: ["/img/ponentes.jpg"] },
  robots: process.env.PREVIEW_MODE === "1" ? { index: false, follow: false } : undefined,
  title: "El Despertar del Emprendedor 2.0 · 14 y 15 de noviembre · Lima",
  description: "Dos días para despertar al emprendedor que llevas dentro. Lima, 14 y 15 de noviembre de 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd).replace(/</g, "\\u003c") }} />
        {process.env.PREVIEW_MODE === "1" && <div className="preview-bar">Vista previa de diseño · aún no publicada · compras desactivadas</div>}
        <div className="progress" aria-hidden />
        <Nav />
        {children}
        <Footer />
        <Motion />
        <Cursor />
        <AdvisorRef />
      </body>
    </html>
  );
}
