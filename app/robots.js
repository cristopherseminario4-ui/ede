export default function robots() {
  const base = process.env.BASE_URL || "http://localhost:3100";
  if (process.env.PREVIEW_MODE === "1") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/demo", "/contabilidad", "/c/", "/v/", "/asesor", "/aceptar", "/gracias", "/api/"] }], sitemap: `${base}/sitemap.xml` };
}
