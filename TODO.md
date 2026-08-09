# TraceLess — TODO de Produccion

## Estado: MVP listo para uso real

## Auditoría (2026-08-09) — aplicada y desplegada
- [x] **RLS en producción**: cache, creditos, facturas_pendientes (verificado 401 con anon key)
- [x] **XSS pdf.py**: escape HTML en detalles
- [x] **Numeración**: helper `_ultimo_numero_usuario` (dedupe programadas)
- [x] **Webhook MP**: idempotencia (`mp_paid:{id}`) + plan real (`traceless_plan:{key}:{uid}`)
- [x] **Checkout**: back_urls + auto_return
- [x] **Links PDF**: `/api/facturas/{id}/public` + fix 404 `.single()`
- [x] **CUIT**: validación dígito verificador + rechazo factura $0
- [x] **Frontend**: catch Dashboard/Facturas, refresh_token Register/logout, flex-wrap mobile, tsc limpio
- [x] **npm audit**: xlsx → read-excel-file + write-excel-file (sin CVEs)
- [x] **Secrets ARCA**: cifrados con Fernet + migrados los usuarios de prod
- [x] **Sin retry SOAP**: solo retry de login (idempotente), el resto lo hace la cola

## Verificación de infraestructura (confirmado en prod)
- [x] `cache` existe en prod (key/token/sign/expires/created_at)
- [x] CRON_SECRET alineado: Production == local; 7/7 crons responden 200
- [x] PWA icons 192/512 + apple-touch-icon generados
- [x] RLS activo en cache/creditos/facturas_pendientes

## Pendiente manual (requiere al usuario)
- [ ] Test real: emitir factura con CAE y pagar link MP (sandbox) → verificar webhook en logs
- [ ] Cancelar suscripción de prueba → confirmar plan Gratis
- [ ] Confirmar `ARCA_ENC_KEY`/`MP_WEBHOOK_SECRET` seteado en Vercel Production/Preview
- [ ] Importar planilla Excel de prueba (clientes + facturas)

## Deuda técnica opcional (no bloquea MVP)
- [ ] Error tracking (Sentry o similar)
- [ ] Request logging
- [ ] Health check dashboard
- [ ] Code-splitting del bundle (chunk > 500KB en frontend)
- [ ] Stripe/MercadoPago subscription management desde la app
- [ ] Mover env vars definitivamente fuera del repo (solo en Vercel)

## Marketing
- [ ] Google Analytics / Umami
- [ ] Post de lanzamiento para redes sociales