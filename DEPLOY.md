# Salida a producción — ede-evento.com

Estado: la **vista previa** (`PREVIEW_MODE=1`) está en Vercel para aprobar el diseño. Para la web oficial, que cobra y guarda datos, hacen falta los puntos de abajo.

## 1 · Dónde se aloja la web oficial
La web guarda pedidos, vouchers, comprobantes y reclamos en **una base SQLite y en la carpeta `data/`** del servidor. Eso necesita **disco persistente**.
- ✔ Render (servicio web + *Persistent Disk*), un VPS o Railway con volumen.
- ✖ Vercel (serverless): no conserva archivos. Solo sirve para la vista previa.
- Alternativa futura: pasar a Postgres + almacenamiento de archivos (S3/Cloudflare R2).

Comando de arranque: `npm run build` y `npm start` (puerto por defecto 3100; en Render usa `$PORT`).

## 2 · Variables de entorno (ver `.env.local.example`)
| Variable | Para qué |
|---|---|
| `BASE_URL` | URL pública, ej. `https://ede-evento.com` (links de pago, vouchers, correo) |
| `MP_ACCESS_TOKEN` | Credencial de **producción** de Mercado Pago |
| `MP_WEBHOOK_SECRET` | Firma de webhooks (Mercado Pago → Webhooks) · URL: `{BASE_URL}/api/webhook` |
| `ADMIN_PASSWORD` | Clave del panel de administración (larga) |
| `ADMIN_PATH` | Ruta secreta del panel (en producción `/admin` da 404) |
| `SESSION_SECRET` | Cadena aleatoria larga: firma las sesiones de contabilidad |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | Correo desde la plataforma (comprobantes, reclamos) |
| `DJANGO_API_URL`, `DJANGO_API_KEY`, `DJANGO_EVENTO_ID`, `DJANGO_TARIFAS` | Puente con el sistema de entradas (QR, correo/WhatsApp, puerta) |

**No** definir `PREVIEW_MODE` ni `ALLOW_DEMO` en producción. Sin `MP_ACCESS_TOKEN` el checkout rechaza las compras.

## 3 · Sistema Django (Render, ya existente)
- En Django definir `API_KEY` (o `API_KEYS_EXTRA`) = la misma clave que `DJANGO_API_KEY`.
- Las tarifas de Django deben llamarse como indica `DJANGO_TARIFAS` (por defecto EMPRENDEDOR, VIP, EMPRESARIAL).
- Pagos por Mercado Pago entran confirmados; ventas de asesor entran **pendientes** con el voucher enlazado y contabilidad las confirma en Django.
- Subdominios sugeridos: web en `ede-evento.com`, sistema en `sistema.ede-evento.com` (no se enlaza desde la web).

## 4 · Antes de abrir las ventas
1. Borrar datos de prueba (asesor `prueba`, usuario `conta.prueba`, pedidos y reclamos de prueba) y cambiar la clave de administración.
2. Probar una compra real de bajo monto y el webhook (requiere URL pública https).
3. Confirmar con cada ponente su ficha (`lib/speakers.js`, campo `verified`).
4. Revisar con el asesor legal: Términos (PDF v3 desalineado con lo decidido), Política de Privacidad, Libro de Reclamaciones.
5. Confirmar datos pendientes: fin de la preventa (5/11/2026 asumido), local y horario del día 1 y día 2.
6. Dominio en el hosting elegido y certificado https.
7. Correr `node scripts/smoke.mjs https://…` solo en un entorno de pruebas (crea datos).

## 5 · Mantenimiento
- Respaldo diario de `data/` (base + vouchers + comprobantes + reclamos).
- Reclamos: 15 días hábiles (se ven en el panel de administración).
- Cuando exista API de facturación, se conecta en `app/api/conta/emitir` (hoy es manual).
