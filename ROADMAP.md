# TraceLess Roadmap

## Pendiente (hacer mañana)

### Configuración Supabase (5 min)
- [ ] **Email Templates**: Cambiar URL base a `https://www.traceless.com.ar` en Confirm signup y Reset Password
- [ ] **URL Configuration**: 
  - Site URL: `https://www.traceless.com.ar`
  - Redirect URLs: agregar `https://www.traceless.com.ar/verify-email` y `https://www.traceless.com.ar/reset-password`

### Verificar funcionalidad
- [ ] Probar registro → recibir email de verificación → verificar → login
- [ ] Probar forgot password → recibir email → restablecer → login

## Completado

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
