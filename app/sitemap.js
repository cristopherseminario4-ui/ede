export default function sitemap() {
  const base = process.env.BASE_URL || "http://localhost:3100";
  return ["", "/ponentes", "/experiencia", "/entradas", "/stands", "/faq", "/terminos"].map((p) => ({ url: base + p, changeFrequency: "weekly" }));
}
