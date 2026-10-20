# Plan: un solo sistema con Django como base (después del 15-nov-2026)

Decisión del dueño (20-oct-2026): **por fases**. Para el evento, Django sigue siendo el registro oficial de asistentes, QR y puerta, y la landing le envía cada venta (como ya funciona). Después del evento, la información operativa de la landing pasa a Django y la landing queda solo como vitrina.

**Regla fija: el mapa (app `lotes`, rutas `/lotes/`, `/plano/`, `/mapa/`) no se toca.** Tampoco se reutiliza el grupo `Asesores` (es del mapa).

## Estado actual (para el evento)
| Dato | Dónde vive hoy | Fuente oficial |
|---|---|---|
| Asistentes, QR, ingreso en puerta, envío de entrada | Django | Django |
| Pedidos web y pagos Mercado Pago | Landing (SQLite) → se registra en Django al pagar | Django (participante) |
| Ventas de asesor, voucher, n.º de operación, aceptación de T&C | Landing → Django como pendiente con `voucher_url` y notas | Django confirma el pago |
| Asesores (PIN), usuarios de contabilidad, comprobantes, reclamos | Landing | Landing (temporal) |

## Fases (estimación de un desarrollador)
| Fase | Qué | Días | Riesgo | Cómo se revierte |
|---|---|---|---|---|
| 0 | Respaldo `pg_dump`, confirmar `BASE_URL` y plan de Render, línea base de tests en Postgres | 1 | Bajo | — |
| 1 | App nueva `ventas` en Django (modelos aditivos: Pedido, Asesor, AceptacionTyC, ArchivoPrivado, VoucherPedido, DocumentoTributario, Reclamo, ComisionAsesor, auditoría). Sin endpoints | 3-4 | Bajo (solo tablas nuevas) | `migrate ventas zero` |
| 2 | API `/api/v1/` (catálogo con cupos, pedidos con `select_for_update`, Mercado Pago y webhook en Django). Landing con interruptor `USE_DJANGO_BACKEND` | 5-7 | Medio | Apagar el interruptor |
| 3 | Asesores, vouchers, T&C y bandeja de contabilidad dentro de Django | 5-6 | Medio | Interruptor |
| 4 | Comprobantes (PDF por correo) y Libro de Reclamaciones en Django | 4-5 | Bajo-medio | Interruptor |
| 5 | Retirar la SQLite de la landing; rotar claves | 2-3 | Bajo | Git |
| 6 | Pruebas de extremo a extremo, carga y restauración | 3 | — | — |

Total ≈ 24-30 días. Mínimo útil (fases 0-3) ≈ 14-18 días.

## Decisiones pendientes para esa etapa
1. Archivos: guardarlos en Postgres (recomendado al inicio) o en almacenamiento externo (R2/S3).
2. Mercado Pago dentro de Django (recomendado) o en la landing.
3. Regla de comisión de asesores.
4. Cupos únicos entre web, asesores y la hoja de Google (`docs/apps_script_hoja_ventas.gs`), o retirar la hoja.
5. Contabilidad pasa de `/contabilidad` (landing) a la bandeja en Django.

## Hallazgos en Django a revisar (sin tocar ahora)
- El servicio está en `plan: free` (se duerme): para el evento conviene plan de pago (la app de puerta y los QR dependen de él).
- `Participante.save` calcula `cod_cliente` con `Max+1` sin bloqueo: posibles duplicados con ventas simultáneas.
- El QR guardado en `Participante.qr` apunta a `/validar/<token>/`, pero la ruta real es `/participantes/validar/` (los correos usan la correcta).
- Versiones de Python distintas entre `runtime.txt`, `render.yaml` y `Dockerfile`.
