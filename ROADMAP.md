# TraceLess — Roadmap

## Pivote completado: Breach-Check → Data Broker Removal

### Valor
- **Antes**: "¿Dónde está expuesto tu email?" → breach-check (gratis en HIBP/XposedOrNot)
- **Ahora**: "¿Quién está vendiendo tus datos?" → eliminación de datos de brokers argentinos

### Público objetivo
- Padres argentinos preocupados por la privacidad familiar
- Personas que encuentran su DNI/domicilio en Dateas/Datacels
- Usuarios que pagan $5-12 USD/mes por privacidad

---

## Completado

### Infraestructura
- Despliegue en Vercel: https://traceless-gamma.vercel.app
- Clerk auth (registro, inicio de sesión)
- Stripe billing (planes Básico y Pro)
- Supabase (base de datos)
- Dominio: traceless.com.ar (DNS delegado a Vercel)
- Zoho Mail (contacto@traceless.com.ar, soporte@traceless.com.ar, etc.)
- Vercel Analytics
- Favicon y logo

### Funcionalidades
- Escaneo de brokers argentinos (Dateas, Datacels, Busca-datos, Buscadatos)
- Búsqueda por DNI, nombre o email
- Cartas de eliminación internacionales (GDPR/CCPA/Ley 25.326)
- Cartas Habeas Data (Ley 25.326)
- Planes Free ($0) / Básico ($5 USD) / Pro ($12 USD)
- Dashboard con resultados de escaneo
- Monitoreo mensual de brokers
- Batch deletion (apertura masiva de páginas de baja)
- Carta maestra (varios brokers seleccionados)
- Páginas: dashboard, historial, cartas, monitoreo, configuración, premium
- Landing page actualizada (nuevo hero, search por DNI)
- FAQ actualizado

### Marketing
- Cuenta Instagram: @tracelessapp
- Cuenta Twitter/X: @tracelessapp
- Logo y branded images creados
- SALES_PLAN.md (estrategia por red social)

---

## Pendiente — MVP Manual

### Validación (Semana 1-2)
- [ ] Crear landing page estática en traceless.com.ar
- [ ] Formulario de "Quiero eliminar mis datos"
- [ ] Primeros 5 clientes manuales (hacer eliminaciones vos)
- [ ] Cobrar $5 USD por cliente (Stripe/Mercado Pago)
- [ ] Validar: ¿alguien paga por esto?

### Automatización (Semana 3-4)
- [ ] Crear templates de email para cada broker
- [ ] Enviar emails de eliminación via Zoho Mail
- [ ] Tracking de respuestas en spreadsheet
- [ ] Automatizar envío de emails si funciona

### Escalamiento (Mes 2+)
- [ ] Construir SaaS completo si hay demanda
- [ ] Agregar más brokers (Uruguay, Chile, Colombia)
- [ ] Monitoreo automático de reaparición de datos
- [ ] App móvil

---

## Pendiente — requiere acción del usuario

### Marketing
- [ ] Crear página LinkedIn: TraceLess
- [ ] Crear cuenta TikTok: @tracelessapp
- [ ] Definir estrategia de contenido (reels de privacidad)
- [ ] Calendario de contenido: 3-5 posts por semana
- [ ] Contactar influencers de privacidad en Argentina

### Legal
- [ ] Registrar TraceLess como emprendimiento
- [ ] Definir términos y condiciones
- [ ] Política de privacidad completa
- [ ] Aviso de cookies

### Ops
- [ ] Crear spreadsheet de tracking de eliminaciones
- [ ] Definir SLA de respuesta a clientes
- [ ] Crear templates de respuesta para cada broker
- [ ] Documentar proceso de eliminación manual

---

## Métricas de éxito (Mes 1)

| Métrica | Objetivo |
|---------|----------|
| Landing page visits | 100 |
| Formularios enviados | 20 |
| Clientes pagando | 5 |
| Ingreso | $25 USD |
| Costo dominio | $8,500 ARS (~$8.5 USD) |
| ROI | +$16.5 USD |

---

## Pricing

| Plan | Precio | Incluye |
|------|--------|---------|
| Free | $0 | Escaneo de 2 brokers, 2 búsquedas/mes |
| Básico | $5 USD/mes | Escaneo ilimitado, eliminación de 3 brokers, monitoreo mensual |
| Pro | $12 USD/mes | Todo + eliminación de todos los brokers, monitoreo continuo, alertas |

---

## Referencia de competencia

| Servicio | Precio | Cobertura |
|----------|--------|-----------|
| PrivacyOn | $8.33/mes | 100+ brokers, familia 5 |
| Atlas Privacy | $10.50/mes | 150+ sitios |
| TraceLess Básico | $5 USD/mes | 3 brokers argentinos |
| TraceLess Pro | $12 USD/mes | Todos los brokers argentinos |
