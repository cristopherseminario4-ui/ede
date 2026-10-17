# Contexto del proyecto: landing + venta de entradas EDE 2.0

> Documento para que otra instancia de Claude (o una persona) analice, audite o continúe el proyecto.
> Estado al 17-oct-2026. **Todo corre solo en local; nada está publicado** (pedido expreso del dueño: "primero probamos todo en local").

## 1. Qué es
Sitio web oficial y tienda de entradas de **El Despertar del Emprendedor 2.0 (EDE 2.0)**, evento formativo/motivacional/networking en **Lima, 14 y 15 de noviembre de 2026**. Organiza EL DESPERTAR DEL EMPRENDEDOR S.A.C. (RUC 20616546474), parte de Hilario GRP. Figura principal: Vitmer Hilario.

Objetivo: página tipo landing, de estilo minimalista y fuera de lo común, con pasarela de pago, que alimente el control de ingreso con QR en puerta.

## 2. Decisiones ya tomadas por el dueño
- Todo local primero; **no subir/publicar nada** sin permiso.
- Documento legal base: **Términos y Condiciones v3** (PDF, 14 págs., actualizado 16-oct-2026), con correcciones a mano (versión impresa de 5 págs.).
- **Pasarela: solo Mercado Pago** (el PDF v3 aún nombra Culqi/Yape/Plin/PagaPe → hay que alinear el PDF).
- **Las 3 zonas se compran en la web** (el PDF, art. 3.02, dice que VIP y Empresarial solo por asesor → contradicción por corregir).
- Diseño con el **esquema de colores de la presentación** (negro + violeta; Emprendedor gris, VIP naranja, Empresarial violeta, Oro dorado).
- Menores de hasta 5 años entran gratis. Día 2: 9:00 am a 9:00 pm. Cesión de entrada hasta 48 h antes. Validación de voucher 24 h. Devolución 15 días hábiles (neta de comisión de la plataforma de pago). No hay devolución por inasistencia.

## 3. Datos de negocio (fuente: PRESENTACION EDE FINAL.pptx)
| Zona | Días | Preventa | Venta regular | Cupos |
|---|---|---|---|---|
| Emprendedor | Día 2 | S/ 150 | S/ 200 | 780 |
| VIP | Día 1 y 2 | S/ 1,000 | S/ 1,500 | 70 |
| Empresarial | Día 1 y 2 | S/ 1,999 | S/ 2,500 | 50 |

Total 900 cupos. Preventa asumida hasta el **5/11/2026** (nota manuscrita; por confirmar). Empresarial incluye "Programa de Bancarización" (línea de hasta S/ 15,000, monto referencial no garantizado). Stands: Diamante S/10,000, Oro S/4,000, Plata S/3,000, Gastronómico S/1,500 (se gestionan con asesor, no hay pago en web). Ponentes: Vitmer Hilario, Sandro Meléndez, Jair Arango, César Mormontoy, Javier Cubas, Augusto Peñaloza, Yudis Lonzoy. Día 1: Hacienda D'Paso; Día 2: Lima (posible Centro Daniel Alcides Carrión, sin confirmar).

Contactos: WhatsApp VIP/Empresarial +51 936 080 473; administrativo +51 955 200 218; correo el.despertar.del.emprendedor@hilariogrp.com.

## 4. Stack
Next.js 15 (App Router, JavaScript sin TypeScript), React 19, GSAP + ScrollTrigger, Lenis (scroll suave), `qrcode` (QR del pedido), base de datos **SQLite nativa de Node (`node:sqlite`, archivo `data/ede.db`)**. Fuentes Montserrat y Playfair Display (next/font). CSS plano (`app/globals.css` + `app/v3.css`, este último gana en conflictos). Node v24. Puerto **3100** (el 3000 lo usa otro proceso del usuario). Arranque: `npm run dev` dentro de `landing-ede/` (o preview "landing-ede" definido en `../.claude/launch.json`).

## 5. Mapa de archivos
```
landing-ede/
  app/
    layout.js          Nav + Footer + Motion + Cursor (globales)
    template.js        transición de página (solo opacidad)
    page.js            Home: hero, marquee, palabras fijas, manifiesto, stats, ponentes, días, tickets, libro, cierre
    ponentes/ experiencia/ entradas/ stands/ faq/ terminos/   páginas
    gracias/page.js    pase de entrada con QR (server component, lee la BD)
    admin/page.js      panel interno (cliente) · admin/layout.js (noindex)
    api/checkout/      POST: valida, crea pedido, crea preferencia de Mercado Pago (o modo demo)
    api/webhook/       POST: Mercado Pago confirma pago → marca "paid"
    api/availability/  GET: cupos libres por zona
    api/admin/orders/  GET lista+totales · [code] PATCH cambia estado · api/admin/export  GET CSV
  components/  Hero, Tickets (mapa de zonas + modal de compra), Days, SpeakerSpotlight, PageHead, Nav, Footer, Motion (todas las animaciones), Cursor
  lib/  config.js (evento, zonas, precios, stands)  orders.js (SQLite)  availability.js  admin.js (auth del panel)
  public/  img/ (logo, escudo, fotos), video/ (hero.mp4, hielo.mp4), docs/terminos-v3.pdf
  data/ede.db  (BD local, generada)   .env.local.example
```
Assets de marca vienen de las carpetas `Downloads/Logo-…-001/003/004/005` (logo PNG con transparencia, escudo, videos animados "fuego y hielo", "logo hielo", "rayo"). Videos originales pesan 100–800 MB; en `public/video` hay versiones comprimidas.

## 6. Flujo de compra (backend)
1. Usuario elige zona → modal (nombre, DNI, teléfono, correo, boleta/factura + RUC/razón social, aceptación de T&C).
2. `POST /api/checkout`: validación de campos, límite 8 intentos/min por IP, zona agotada → 409, mismo DNI ya pagado en la zona → 409. **El precio lo calcula el servidor** (`currentPrice` según fecha). Guarda pedido `pending` con versión de T&C y fecha de aceptación.
3. Con `MP_ACCESS_TOKEN`: crea preferencia en Mercado Pago y devuelve `init_point` (o `sandbox_init_point` si el token empieza por `TEST-`). **Sin token: modo demo** (marca `paid-demo` y salta a `/gracias`).
4. Webhook `/api/webhook` (solo funciona con URL pública https) consulta el pago a Mercado Pago y marca `paid`.
5. Cupos = pagados + pedidos `pending` de los últimos 30 min. Código de pedido `EDE26-XXXX` (único, sin caracteres ambiguos).
6. `/gracias?code=…` muestra el pase con QR **cuyo contenido es solo el código del pedido**.
7. Panel `/admin`: cabecera `x-admin-key`; clave = `ADMIN_PASSWORD` (en local por defecto `ede-local-admin`; en producción sin variable el panel se deshabilita). Marca pagado/anulado a mano, filtra, exporta CSV (con protección contra inyección de fórmulas).

## 7. Animaciones (decisiones de ingeniería)
Todo en `components/Motion.js`, activado por atributos: `data-split` (palabras con máscara), `data-reveal` / `data-reveal="stagger"`, `data-parallax`, `data-count`, `data-fill`, `data-words` (sección fija con cambio de palabra), `data-tilt` (3D), `data-magnetic`. Respeta `prefers-reduced-motion`.
**Bug corregido:** antes los precios desaparecían al pasar el cursor, porque la animación de entrada era una clase CSS añadida por JS y React la borraba al re-renderizar. Ahora GSAP anima con estilos en línea y los limpia al terminar (`clearProps`). No volver a usar clases añadidas por JS sobre elementos que React re-renderiza.

## 8. Pendientes y riesgos (para el análisis)
**Bloqueantes antes de publicar**
- Integración con el sistema de puerta ya existente (ver §9): hoy la web genera su propio QR (código del pedido) que **no** abre en la app de puerta; además la web **no envía correo ni WhatsApp**.
- Credenciales de prueba y producción de **Mercado Pago**; probar pago real y webhook (requiere URL pública).
- PDF de T&C v3 desalineado con lo decidido (Culqi vs Mercado Pago; VIP/Empresarial por asesor vs web) y con campos `[COMPLETAR]` sin resolver (dirección Hacienda D'Paso y del día 2, horarios del día 1, WhatsApp general, penalidad de separación, ANPD, tiempos).
- Libro de Reclamaciones virtual: solo hay marcador `[POR IMPLEMENTAR]`.
- Comprobantes electrónicos (boleta/factura SUNAT): la web solo guarda la preferencia del cliente; no emite nada.

**Técnicos**
- SQLite en archivo local no sirve en hosting sin disco persistente (p. ej. serverless); para producción elegir Postgres o volumen persistente. Se usa `node:sqlite` (API experimental de Node).
- Límite de intentos en memoria (se reinicia y no escala a varias instancias). Panel admin con clave compartida simple: endurecer (sesión, HTTPS, rate limit).
- El webhook no valida firma `x-signature` de Mercado Pago (solo reconsulta el pago con el token, lo cual es seguro pero conviene añadir la firma).
- Reserva de cupo: 30 min por pedido pendiente; no hay tarea que libere/marque expirados (solo se excluyen del conteo).
- Sin tests automatizados. Sin build de producción verificado (`next build` no se corrió). Rendimiento: hero con video de 2.4 MB; revisar en móvil real.
- Un cupo = una entrada por compra (no hay cantidad múltiple).

**Contenido por confirmar**: fin de preventa (5/11/2026 asumido), local y horario del día 1, local del día 2, "ponencia ante 1000 asistentes" del stand Diamante (los cupos suman 900), quién atiende el WhatsApp 955 200 218, política para menores de 6 a 13 años (hoy dice "consultar por WhatsApp").

## 9. Sistema existente con el que debe integrarse
En la misma carpeta madre (`APP QR EVENTOS/`): `repo/webcliente` (Django: modelos `Participante` con `token` único, QR con URL `/validar/<token>/`, `CodigoPuerta` para dispositivos de puerta, envío de correos/WhatsApp/Twilio, hoja de Excel `repo/Excel/cliente.xlsx`), `repo/android` + `apk/EDE-Puerta*.apk` (app de escaneo en puerta) y `qr_prueba/` (QR de ejemplo). La regla de ingreso vive en `Participante.registrar_ingreso()`. **Propuesta:** un solo QR, el del sistema Django; al confirmarse el pago en la web, crear el `Participante` allá y reutilizar su QR/correo/WhatsApp. Falta decidir dónde corre ese sistema (Render o local) y quién envía hoy los mensajes. También hay `proyecto_entradas_excel-main` en Documents (añadido a la sesión, **no revisado todavía**).

## 10. Cómo verificar rápidamente
```
cd landing-ede && npm install && npm run dev      # http://localhost:3100
GET  /api/availability                              # cupos
POST /api/checkout  {zone,nombre,dni,telefono,correo,comprobante,acepta:true}
GET  /api/admin/orders   (header x-admin-key: ede-local-admin)
```
Rutas: `/`, `/ponentes`, `/experiencia`, `/entradas`, `/stands`, `/faq`, `/terminos`, `/gracias?code=…`, `/admin`.
