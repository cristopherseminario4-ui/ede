# Salida a producción — ede-evento.com

Estado: la **vista previa** (`PREVIEW_MODE=1`) está en Vercel para aprobar el diseño. Para la web oficial, que cobra y guarda datos, hacen falta los puntos de abajo.

## 1 · Dónde se aloja la web oficial (decidido: subdominio)
**Dirección: `https://entradas.ede-evento.com`.** El dominio raíz `ede-evento.com` sigue siendo Django (app de puerta, QR, OAuth y mapa): no se toca.

Para que no se caiga:
1. **Render, plan Starter (no se duerme) + disco persistente** con `render.yaml` de este repo (servicio `ede-landing`). El disco guarda `data/` y Render toma snapshots diarios.
2. **Cloudflare delante** (proxy naranja en el registro `entradas`): absorbe picos de tráfico, sirve lo estático desde caché y frena ataques. Con Cloudflare, `TRUSTED_IP_HEADER=cf-connecting-ip`.
3. **Chequeo de salud** en `/api/health` (Render reinicia si falla). Conviene un monitor externo (UptimeRobot u otro) avisando por WhatsApp o correo.
4. **Reintentos automáticos**: cada 5 min la web reenvía al sistema de entradas las ventas que fallaron (Django dormido o caído).
5. **Django también en plan de pago** antes del evento: hoy está en `plan: free` y se duerme; la app de puerta, los QR y la landing dependen de él.

DNS: en el proveedor del dominio (o Cloudflare) crear `CNAME entradas → ede-landing.onrender.com` y añadir el dominio en Render → Settings → Custom Domains.

Vercel queda solo para la **vista previa** (`PREVIEW_MODE=1`): no conserva archivos.

Comando de arranque: `npm run build` y `npm start` (Render pasa el puerto en `$PORT`; en local `npm run start:local` usa el 3100). Node 22.13 o superior.

## 2 · Variables de entorno (ver `.env.local.example`)
| Variable | Para qué |
|---|---|
| `BASE_URL` | URL pública: `https://entradas.ede-evento.com` (links de pago, vouchers, correo) |
| `MP_ACCESS_TOKEN` | Credencial de **producción** de Mercado Pago |
| `MP_WEBHOOK_SECRET` | Firma de webhooks (Mercado Pago → Webhooks) · URL: `{BASE_URL}/api/webhook` |
| `ADMIN_PASSWORD` | Clave del panel de administración (mín. 24 caracteres; si es más corta el panel no abre) |
| `ADMIN_PATH` | Ruta secreta del panel (en producción `/admin` da 404) |
| `SESSION_SECRET` | Cadena aleatoria de 32+ caracteres: firma sesiones de contabilidad y links de asesor |
| `TRUSTED_IP_HEADER` | Cabecera con la IP real según el proveedor (`cf-connecting-ip`, `x-vercel-forwarded-for`, `x-real-ip`) |
| `ADVISOR_DAILY_MAX` | Tope de ventas manuales por asesor en 24 h (por defecto 40) |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | Correo desde la plataforma (comprobantes, reclamos) |
| `DJANGO_API_URL`, `DJANGO_API_KEY`, `DJANGO_EVENTO_ID`, `DJANGO_TARIFAS` | Puente con el sistema de entradas (QR, correo/WhatsApp, puerta) |

**No** definir `PREVIEW_MODE` ni `ALLOW_DEMO` en producción. Sin `MP_ACCESS_TOKEN` el checkout rechaza las compras.

## 3 · Sistema Django (Render, ya existente)
- En Django definir `API_KEY` (o `API_KEYS_EXTRA`) = la misma clave que `DJANGO_API_KEY`.
- Las tarifas de Django deben llamarse como indica `DJANGO_TARIFAS` (por defecto EMPRENDEDOR, VIP, EMPRESARIAL).
- Pagos por Mercado Pago entran confirmados; ventas de asesor entran **pendientes** con el voucher enlazado y contabilidad las confirma en Django.
- **OJO:** hoy `ede-evento.com` es el sistema Django: la APK de puerta (`https://ede-evento.com/puerta/`), los QR ya emitidos, Google OAuth y el mapa (`/plano/`, `/mapa/`) dependen de ese dominio. **No mover Django de ahí antes del evento.** La landing va en `entradas.ede-evento.com`. Plan de sistema único con Django: ver `PLAN-SISTEMA-UNICO.md`.

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
