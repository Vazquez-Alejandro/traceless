# TraceLess — TODO de Produccion

## Bugs corregidos (Audit 2026-08-01)
- [x] `.env`: Rename AFIP_* → ARCA_* (code reads ARCA_*)
- [x] `.env`: Add ARCA_ENV=produccion (was defaulting to homologacion)
- [x] `.env`: Add ARCA_USE_REAL=1 (was always in mock mode)
- [x] `schema.sql`: Add `cache` table (ARCA TA token cache)
- [x] `email_sender.py`: Remove dead code (double api_key assignment)
- [x] `.env.example`: Created
- [x] `.gitignore`: Fixed .env* to only ignore .env and .env.local

## Mejoras (2026-08-07)
- [x] **PWA**: iconos PNG 192/512 + apple-touch-icon generados y referenciados en manifest.json e index.html
- [x] **Crons**: fix ruta `/api/facturas/recurrentes` que no existía (cron fallaba todos los días); 7/7 crons con ruta
- [x] **Rate limiting**: signup/login/forgot/reset limitados por IP sobre la tabla `cache` (funciona multi-instancia en Vercel); tarjeta de blowout en auth.py
- [x] **Fix schema cache**: código usaba columna `value` inexistente en `cache` (es `token`); rate limit + preapproval persistido en `token` como JSON
- [x] **Tests**: +3 tests de rate limit (25 total)

## Pendiente
- [ ] **Run schema.sql** on Supabase SQL Editor to add the `cache` table (verificado: existe en prod, columnas key/token/sign/expires)
- [x] **CRON_SECRET de Vercel != local** — alineado: Production ahora usa el valor del `.env`; 7/7 crons responden 200 con `Authorization: Bearer CRON_SECRET`
- [ ] **MP_WEBHOOK_SECRET** — fill in for MercadoPago webhook verification
- [ ] **CRON_SECRET in vercel.json** — hardcoded; consider using env var (Vercel limitation: crons need static paths)
- [ ] **WhatsApp phone number** — verify is registered in Meta Business
- [ ] **Domain** — verify DNS records are correct
- [ ] **PWA manifest.json** — references icon-192.png and icon-512.png that don't exist; create SVG icons or fix manifest
- [ ] **Frontend env vars** — verify Vercel has all env vars set (SUPABASE_URL, SUPABASE_ANON_KEY, MP_PUBLIC_KEY, etc.)
- [ ] **Cron jobs** — verify all 5 Vercel crons are working
- [ ] **Notifications** — verify TELEGRAM_NOTIFIER_URL is reachable
- [ ] **Resend domain** — verify traceless.com.ar is verified in Resend

## Marketing
- [ ] Crear landing page en la app (actualmente no tiene)
- [ ] Configurar Google Analytics / Umami
- [ ] Crear post de lanzamiento para redes sociales

## Technical improvements
- [ ] Move .env to Vercel env vars only (remove from repo)
- [ ] Add error tracking (Sentry or similar)
- [ ] Add rate limiting to API endpoints
- [ ] Add request logging
- [ ] Add health check dashboard
- [ ] Consider adding Stripe/MercadoPago subscription management
