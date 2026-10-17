// Prueba de humo de todos los flujos. Uso (con el servidor local encendido):  node scripts/smoke.mjs [http://localhost:3100]
// Crea datos de prueba (asesor, usuario de contabilidad, ventas) en la base LOCAL. No usar contra producción.
const BASE = process.argv[2] || "http://localhost:3100";
const ADMIN = process.env.ADMIN_PASSWORD || "ede-local-admin";
const rnd = Math.random().toString(36).slice(2, 8);
const dni = () => String(Math.floor(10000000 + Math.random() * 89999999));
let fails = 0;
const ok = (name, cond, extra = "") => { console.log(`${cond ? "✔" : "✖"} ${name}${extra ? " · " + extra : ""}`); if (!cond) fails++; };
const j = async (path, opt = {}) => { const r = await fetch(BASE + path, opt); let d = null; try { d = await r.json(); } catch {} return { r, d }; };
const post = (path, body, headers = {}) => j(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
const png = () => new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], { type: "image/png" });
const pdf = () => new Blob(["%PDF-1.4 smoke"], { type: "application/pdf" });
const today = new Date().toISOString().slice(0, 10);

// 1 · Páginas públicas
for (const p of ["/", "/ponentes", "/experiencia", "/entradas", "/stands", "/faq", "/terminos", "/privacidad", "/reclamaciones", "/robots.txt", "/sitemap.xml"]) {
  const r = await fetch(BASE + p); ok(`GET ${p}`, r.status === 200, r.status);
}

// 2 · Cupos y checkout web (modo demo)
const av = await j("/api/availability"); ok("cupos", av.d?.vip?.seats === 70);
const bad = await post("/api/checkout", { zone: "vip", nombre: "A" }); ok("checkout valida campos", bad.r.status === 400);
const web = await post("/api/checkout", { zone: "emprendedor", nombre: "Cliente Web Humo", dni: dni(), telefono: "987654321", correo: `web${rnd}@ejemplo.com`, comprobante: "boleta", acepta: true });
ok("checkout web crea pedido", web.r.status === 200 && web.d?.url?.includes("/gracias?t="));
if (web.d?.url) { const g = await fetch(web.d.url); ok("pase /gracias con token", g.status === 200); }
const fake = await fetch(BASE + "/gracias?t=ABCDEFGHIJKLMNOPQRSTUVWXYZ"); const t = await fake.text(); ok("token falso no muestra datos", !t.includes("Titular"));

// 3 · Admin, asesor y venta manual con aceptación de T&C
const A = { "x-admin-key": ADMIN };
ok("admin sin clave = 401", (await j("/api/admin/orders")).r.status === 401);
const adv = await post("/api/admin/advisors", { code: `smoke${rnd}`, name: "Asesor Humo", pin: "1357" }, A); ok("crear asesor", adv.r.status === 200);
const fd = (extra = {}) => { const f = new FormData(); Object.entries({ code: `smoke${rnd}`, pin: "1357", zone: "emprendedor", nombre: "Cliente Manual Humo", dni: dni(), telefono: "987654321", correo: `m${rnd}@ejemplo.com`, metodoPago: "yape", referencia: `OP${rnd}`, fechaPago: today, montoPagado: "150", pagoRecibido: "true", ...extra }).forEach(([k, v]) => f.append(k, v)); return f; };
const noV = await j("/api/asesor/ventas", { method: "POST", body: fd() }); ok("venta sin voucher se rechaza", noV.r.status === 400);
const f1 = fd(); f1.append("voucher", png(), "v.png");
const sale = await j("/api/asesor/ventas", { method: "POST", body: f1 }); ok("venta manual registrada", sale.r.status === 200 && sale.d?.order?.status === "awaiting_terms");
const f2 = fd({ dni: dni() }); f2.append("voucher", png(), "v.png");
const dup = await j("/api/asesor/ventas", { method: "POST", body: f2 }); ok("n.º de operación repetido se rechaza", dup.r.status === 409);
const f3 = fd({ dni: dni(), referencia: `X${rnd}`, montoPagado: "99" }); f3.append("voucher", png(), "v.png");
const amt = await j("/api/asesor/ventas", { method: "POST", body: f3 }); ok("monto distinto al precio se rechaza", amt.r.status === 400);
const token = sale.d?.order?.acceptUrl?.split("/aceptar/")[1];
const no = await post("/api/aceptar", { token, acepta: false }); ok("sin aceptar T&C no avanza", no.r.status === 400);
const yes = await post("/api/aceptar", { token, acepta: true }); ok("aceptar T&C → en revisión", yes.d?.review === true);

// 4 · Contabilidad: usuario propio, comprobante manual
const u = `conta${rnd}`;
ok("crear usuario contabilidad", (await post("/api/admin/staff", { username: u, name: "Conta Humo", password: "humo1234" }, A)).r.status === 200);
const nl = await j("/api/conta/export"); ok("export sin sesión = 401", nl.r.status === 401);
const login = await fetch(BASE + "/api/conta/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: "humo1234" }) });
const cookie = (login.headers.get("set-cookie") || "").split(";")[0]; ok("login contabilidad", login.status === 200 && !!cookie);
const C = { Cookie: cookie };
const list = await j("/api/conta/orders", { headers: C }); const mine = list.d?.orders?.find((o) => o.code === sale.d?.order?.code);
ok("contabilidad ve la venta con su n.º de operación", mine?.opNumber === `OP${rnd}`);
const e1 = new FormData(); e1.append("code", mine?.code || ""); e1.append("docNumber", "hola"); e1.append("docDate", today); e1.append("pdf", pdf(), "b.pdf");
ok("serie inválida se rechaza", (await j("/api/conta/emitir", { method: "POST", headers: C, body: e1 })).r.status === 400);
const e2 = new FormData(); e2.append("code", mine?.code || ""); e2.append("docNumber", "EB01-1"); e2.append("docDate", today); e2.append("enviar", "false"); e2.append("pdf", pdf(), "b.pdf");
const em = await j("/api/conta/emitir", { method: "POST", headers: C, body: e2 }); ok("registrar boleta EB01-1", em.d?.ok === true);
const l2 = await j("/api/conta/orders", { headers: C }); const doc = l2.d?.orders?.find((o) => o.code === mine?.code);
const pdfRes = doc?.docToken ? await fetch(`${BASE}/c/${doc.docToken}`) : null; ok("PDF del comprobante descargable", pdfRes?.status === 200 && pdfRes.headers.get("content-type") === "application/pdf");
const vRes = doc?.voucherToken ? await fetch(`${BASE}/v/${doc.voucherToken}`) : null; ok("voucher visible con su link", vRes?.status === 200);

// 5 · Libro de Reclamaciones
const rec = await post("/api/reclamaciones", { tipo: "reclamo", nombre: "Persona Humo Prueba", docTipo: "DNI", docNum: dni(), domicilio: "Av. Prueba 123", telefono: "987654321", correo: `r${rnd}@ejemplo.com`, bien: "servicio", descBien: "Entrada EDE", detalle: "Prueba automática del libro.", pedido: "Ninguno, es una prueba.", acepta: true });
ok("reclamo registrado con número", /^HR-\d{6}$/.test(rec.d?.numero || ""), rec.d?.numero);
const rl = await j("/api/admin/complaints", { headers: A }); ok("admin ve reclamos", rl.d?.complaints?.length > 0);

console.log(fails ? `\n${fails} prueba(s) fallaron` : "\nTodo en orden ✔");
process.exit(fails ? 1 : 0);
