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

### 2026-07-21
- [x] Onboarding: plan picker en registro, checklist en dashboard
- [x] WhatsApp limits por plan (Free:0, Basic:50, Pro:300, PyME:500, Corporate:2000)
- [x] Mercado Pago para pagos en pesos (checkout + webhook + precios ARS)
- [x] ARCA retry queue (cola de reintentos con backoff exponencial)
- [x] Tablas Supabase: whatsapp_log, facturas_pendientes
- [x] Eliminación de Lemon Squeezy del frontend (solo Mercado Pago)
- [x] Perfil: layout 2 columnas para desktop
- [x] Forgot password + reset password + email verification (frontend + backend)
- [x] Fix crons para plan Hobby de Vercel (máx 1 ejecución/día)
