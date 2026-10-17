import Contabilidad from "./ContabilidadApp";

// En la vista previa (Vercel, sin base de datos) corre con datos ficticios y un acceso de demostración público.
export default function Page() {
  return <Contabilidad demo={process.env.PREVIEW_MODE === "1"} />;
}
