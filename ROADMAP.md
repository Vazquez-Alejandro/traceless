# TraceLess — Roadmap

## Completado

- Búsqueda simulada de breaches por email
- Generación de cartas de baja (RGPD/LOPDGDD)
- Autocompletado de datos del usuario en cartas (nombre, dirección, DNI)
- Edición de cartas (textarea editable) + modo carta personalizada
- Autenticación con Clerk (registro, inicio de sesión)
- Planes Free ($0) / Premium ($9/mes) / Pro ($39/mes)
- Páginas: dashboard, historial, cartas, monitoreo, clientes, configuración
- Batch deletion (apertura masiva de páginas de baja)
- Carta maestra (varios breaches seleccionados)
- Despliegue en Vercel: https://traceless-gamma.vercel.app
- Middleware de Clerk configurado
- Env vars en Vercel: Clerk, Supabase, Stripe, Resend
- Stripe webhook configurado
- Clerk webhook configurado
- CRON_SECRET configurado
- RESEND_API_KEY configurado (reusada de Inmoxil)
- Precios actualizados: Premium $9, Pro $39

## Pendiente — requiere acción del usuario

### Dominio (urgente)
- [ ] Comprar dominio traceless.com.ar en Nic.ar o Cloudflare (~$4,000 ARS/año)
- [ ] Conectar dominio a Vercel
- [ ] Configurar DNS para email (Zoho Mail)

### Supabase
- [ ] Reactivar proyecto Supabase en https://supabase.com (actualmente pausado)
- [ ] Verificar que las tablas existan (users, searches, letters, monitoring)

### Email profesional
- [ ] Crear cuenta en Zoho Mail (plan Free)
- [ ] Crear contacto@traceless.app
- [ ] Actualizar EMAIL_FROM en Vercel con el dominio real

### Stripe products
- [ ] Verificar que los planes Premium ($9) y Pro ($39) estén creados en Stripe Dashboard
- [ ] Probar flujo de pago completo

### Marketing
- [ ] Crear cuenta Instagram: @tracelessapp
- [ ] Crear cuenta TikTok: @tracelessapp
- [ ] Crear página LinkedIn: TraceLess
- [ ] Definir estrategia de contenido (reels de privacidad, tips de seguridad)
- [ ] Calendario de contenido: 3-5 posts por semana

## A futuro

### Búsqueda real de breaches
- [ ] Integrar API real (DeHashed, HaveIBeenPwned, o similar)
- [ ] Remover búsqueda simulada
- [ ] Agregar más fuentes de datos

### Monitoreo semanal
- [ ] Verificar que el cron job funcione (lunes 10:00 UTC)
- [ ] Testear envío de reportes semanales por email

### Reporte PDF
- [ ] Generar PDF descargable con resultados de búsqueda
- [ ] Incluir cartas de baja en el reporte

### Mejoras UX
- [ ] Vista previa de la carta antes de copiar
- [ ] Guardar cartas personalizadas del usuario
- [ ] Carga de cartas propias (subir PDF/texto)

### Chrome Extension
- [ ] Publicar extensión en Chrome Web Store
- [ ] Agregar más features a la extensión
