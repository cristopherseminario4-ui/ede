import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./v3.css";
import "./v4.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import Cursor from "@/components/Cursor";

const sans = Montserrat({ subsets: ["latin"], variable: "--sans", weight: ["300", "400", "500", "700", "900"] });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--serif", style: ["italic"], weight: ["400"] });

export const metadata = {
  robots: process.env.PREVIEW_MODE === "1" ? { index: false, follow: false } : undefined,
  title: "El Despertar del Emprendedor 2.0 · 14 y 15 de noviembre · Lima",
  description: "Dos días para despertar al emprendedor que llevas dentro. Lima, 14 y 15 de noviembre de 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`}>
      <body>
        {process.env.PREVIEW_MODE === "1" && <div className="preview-bar">Vista previa de diseño · aún no publicada · compras desactivadas</div>}
        <div className="progress" aria-hidden />
        <Nav />
        {children}
        <Footer />
        <Motion />
        <Cursor />
      </body>
    </html>
  );
}
