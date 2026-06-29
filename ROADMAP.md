# TraceLess — Roadmap

## 🟢 Completado

- [x] Búsqueda simulada de breaches por email
- [x] Generación de cartas de baja (RGPD/LOPDGDD)
- [x] Autocompletado de datos del usuario en cartas (nombre, dirección, DNI)
- [x] Edición de cartas (textarea editable) + modo carta personalizada
- [x] Autenticación con Clerk (registro, inicio de sesión)
- [x] Planes Free / Premium / Pro con límites
- [x] Páginas: dashboard, historial, cartas, monitoreo, clientes, configuración
- [x] Batch deletion (apertura masiva de páginas de baja)
- [x] Carta maestra (varios breaches seleccionados)
- [x] Despliegue en Vercel: https://traceless-gamma.vercel.app
- [x] Middleware de Clerk configurado
- [x] Env vars en Vercel: Clerk, Supabase, Stripe (price IDs + secret key)

## 🟡 Pendiente — requiere acción del usuario

### Supabase (base de datos)
- [ ] Reactivar proyecto Supabase en https://supabase.com (actualmente pausado)
- [ ] Ejecutar `supabase/schema.sql` en el SQL Editor para crear tablas
- [ ] Verificar conexión: `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### Stripe (pagos)
- [ ] Configurar webhook en Stripe Dashboard → `https://traceless-gamma.vercel.app/api/webhooks/stripe`
- [ ] Agregar `STRIPE_WEBHOOK_SECRET` a Vercel
- [ ] Agregar `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` a Vercel

### Resend (emails)
- [ ] Crear API key en https://resend.com
- [ ] Agregar `RESEND_API_KEY` a Vercel
- [ ] Agregar `EMAIL_FROM` a Vercel (ej: `noreply@tudominio.com`)

### Clerk webhook (sincronización de usuarios)
- [ ] Configurar webhook en Clerk Dashboard → `https://traceless-gamma.vercel.app/api/webhooks/clerk`
- [ ] Agregar `CLERK_WEBHOOK_SECRET` a Vercel
- [ ] Eventos a suscribir: `user.created`, `user.updated`

## 🔵 A futuro

### Búsqueda real de breaches
- [ ] Integrar API real (DeHashed, HaveIBeenPwned, o similar)
- [ ] Remover búsqueda simulada
- [ ] Agregar más fuentes de datos

### Monitoreo semanal
- [ ] Programar tarea recurrente (Vercel Cron Jobs o similar)
- [ ] Enviar email al usuario cuando se detecten nuevas filtraciones

### Reporte PDF
- [ ] Generar PDF descargable con resultados de búsqueda
- [ ] Incluir cartas de baja en el reporte

### Mejoras UX
- [ ] Vista previa de la carta antes de copiar
- [ ] Guardar cartas personalizadas del usuario
- [ ] Carga de cartas propias (subir PDF/texto)
- [ ] Notificar al usuario que revise sus datos antes de enviar (ya implementado)
