const dev = process.env.NODE_ENV !== "production";

// Política de contenido: solo recursos propios. 'unsafe-inline' en scripts/estilos lo exige Next sin nonce; 'unsafe-eval' solo en desarrollo (HMR).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

export default {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // El evento vive en la raíz del dominio. Estas direcciones largas llevan al mismo sitio (útiles para campañas y enlaces antiguos).
  async redirects() {
    return [
      { source: "/el-despertar-del-emprendedor", destination: "/", permanent: true },
      { source: "/el_despertar_del_emprendedor", destination: "/", permanent: true },
      { source: "/ede", destination: "/", permanent: false },
    ];
  },
};
