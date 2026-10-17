import { NextResponse } from "next/server";

// Rutas internas ocultas: en producción /admin responde 404 y el panel solo se abre por /<ADMIN_PATH>.
// El resto de sistemas (Django: puerta, panel, validación) viven en otros subdominios y no se enlazan desde esta web.
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const slug = process.env.ADMIN_PATH;
  const prod = process.env.NODE_ENV === "production";

  if (slug && pathname === `/${slug}`) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.rewrite(url);
  }
  if (prod && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const res = NextResponse.next();
  if (process.env.PREVIEW_MODE === "1") res.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (pathname.startsWith("/gracias") || pathname.startsWith("/asesor") || pathname.startsWith("/aceptar") || pathname.startsWith("/v/") || pathname.startsWith("/admin") || pathname.startsWith("/api")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/((?!_next/|img/|video/|docs/|favicon).*)"] };
