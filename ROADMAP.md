# TraceLess Roadmap

## Pendiente (antes de lanzar)

### Activar keep-alive del notificador de Telegram ✔
- [x] Monitor **HTTPS** creado en `uptimerobot.com`
  - URL: `https://www.traceless.com.ar/api/keepalive?telegram=1` (intervalo 5 min)
  - Verificado en producción: responde `200` con `{"status":"ok","keepalive":"telegram:200"}`

## Completado

### 2026-08-07 — Pricing USD + facturación ARCA
- [x] Precios anclados en **USD** (Pro USD 12, Equipo USD 22) con conversión automática a ARS usando cotización diaria (dolarapi, modo oficial, configurable `DOLAR_MODE`) y caché de 1h
- [x] Checkout/suscripción MercadoPago y `/me/plan` cobran el equivalente en pesos calculado al generar el pago (MP no convierte solo)
- [x] `/api/mercadopago/prices` devuelve USD + ARS + tipo de cambio; frontend (Landing, Register, Perfil) muestra USD con "≈ pesos"
- [x] Landing: plan Gratis → "Freemium" (nombre) / "Gratis" (precio), fix precio incorrecto en card
- [x] Test real de factura con CAE contra ARCA (producción): CAE válido, punto de venta 2 habilitado
- [x] **Fix notas de crédito**: emisión real ante ARCA (CbteAsoc, NC C sin IVA, extracción de observaciones). Canceladas las 3 facturas de prueba con CAE
- [x] Endpoint `/api/keepalive` (ping inofensivo a `/health` del notifier) desplegado en producción
- [x] Config Supabase: email templates y URLs apuntan a `https://www.traceless.com.ar`
- [x] Flujo verificado: registro + confirmación de email + login, y forgot/reset password

### 2026-07-21 — Simplificación a 3 planes
- [x] **Planes reducidos a 3**: Gratis ($0), Profesional ($15.000/mes), Equipo ($29.000/mes)
- [x] **Features por plan en backend**: `analytics`, `recurrentes`, `multi_user`, `retry_queue`
- [x] **/me endpoint**: Devuelve `plan_key` y `features` para que el frontend sepa qué ocultar
- [x] Landing: 3 planes, grid `md:grid-cols-3`
- [x] Register: 3 opciones de plan
- [x] Perfil: 3 opciones de plan
- [x] Dashboard: Analytics bloqueado para plan Gratis con CTA a desbloquear
- [x] Facturas: Checkbox "recurrente" bloqueado para plan Gratis con link a /perfil

### 2026-07-21
- [x] Onboarding: plan picker en registro, checklist en dashboard
- [x] WhatsApp limits por plan (Free:0, Pro:300, Team:1000)
- [x] Mercado Pago para pagos en pesos (checkout + webhook + precios ARS)
- [x] ARCA retry queue (cola de reintentos con backoff exponencial)
- [x] Tablas Supabase: whatsapp_log, facturas_pendientes
- [x] Eliminación de Lemon Squeezy del frontend (solo Mercado Pago)
- [x] Perfil: layout 2 columnas para desktop
- [x] Forgot password + reset password + email verification (frontend + backend)
- [x] Fix crons para plan Hobby de Vercel (máx 1 ejecución/día)
