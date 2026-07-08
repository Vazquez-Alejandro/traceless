# TraceLess — Roadmap

## Estado actual
- **URL**: https://traceless-gamma.vercel.app
- **Dominio**: traceless.com.ar (DNS delegado a Vercel)
- **Misión**: Proteger la identidad digital de argentinos eliminando sus datos de brokers de datos

---

## Completado

### Core
- Escaneo de brokers argentinos (Dateas, Datacels, Busca-datos, Buscadatos)
- Búsqueda por DNI, nombre o email
- Cartas de eliminación internacionales (GDPR/CCPA/Ley 25.326)
- Cartas Habeas Data (Ley 25.326)
- Dashboard con resultados de escaneo
- Batch deletion (apertura masiva de páginas de baja)
- Carta maestra (varios brokers seleccionados)

### Planes
- Free ($0): 2 búsquedas/mes
- Básico ($5 USD/mes): Escaneo ilimitado, 3 brokers, monitoreo mensual
- Pro ($12 USD/mes): Todos los brokers, monitoreo dark web, alertas
- Familia ($15 USD/mes): 5 miembros, monitoreo menores
- Corporativo ($75 USD/mes): 25 empleados, dashboard, compliance

### Infraestructura
- Clerk auth
- Stripe billing
- Supabase (base de datos)
- Vercel deployment
- Zoho Mail (contacto@, soporte@, etc.)
- Vercel Analytics
- Favicon y logo

### Marketing
- Instagram: @tracelessapp
- Twitter/X: @tracelessapp
- Logo y branded images

### Monitoreo Dark Web
- Cron job semanal que escanea XposedOrNot
- Alertas por email para planes Pro/Familia/Corporativo
- Integración con API de XposedOrNot

### Programa de Referidos
- Códigos únicos por usuario
- 1 mes gratis por cada 2 referidos que paguen
- Dashboard de stats de referidos

---

## Próximos pasos (Mes 1-2)

### Validación (Semana 1-2)
- [ ] Crear landing page estática en traceless.com.ar
- [ ] Formulario de "Quiero eliminar mis datos"
- [ ] Primeros 5 clientes manuales
- [ ] Cobrar $5 USD por cliente
- [ ] Validar: ¿alguien paga por esto?

### Automatización (Semana 3-4)
- [ ] Crear templates de email para cada broker
- [ ] Enviar emails de eliminación via Zoho Mail
- [ ] Tracking de respuestas en spreadsheet
- [ ] Automatizar envío de emails si funciona

### Tablas Supabase necesarias
- `users`: id, email, name, plan, subscription_status, referral_code, created_at
- `searches`: id, user_id, email, result, created_at
- `letters`: id, user_id, breach_id, email, created_at
- `monitoring`: id, user_id, email, active, created_at, last_checked_at
- `broker_monitoring`: id, user_id, broker, dni, active, status, created_at, next_check_at
- `referrals`: id, referrer_id, referred_id, code, created_at

---

## Métricas de éxito (Mes 1)

| Métrica | Objetivo |
|---------|----------|
| Landing page visits | 100 |
| Registros | 30 |
| Pagos | 10 |
| Ingreso | $50-150 USD |
| Costo dominio | ~$8.5 USD |
| ROI | +$41-141 USD |

---

## Pricing

| Plan | Precio | Incluye |
|------|--------|---------|
| Free | $0 | Escaneo de 2 brokers, 2 búsquedas/mes |
| Básico | $5 USD/mes | Escaneo ilimitado, 3 brokers, monitoreo mensual |
| Pro | $12 USD/mes | Todos los brokers, monitoreo dark web, alertas |
| Familia | $15 USD/mes | 5 miembros, monitoreo menores |
| Corporativo | $75 USD/mes | 25 empleados, dashboard, compliance |

---

## Referencia de competencia

| Servicio | Precio | Cobertura |
|----------|--------|-----------|
| PrivacyOn | $8.33/mes | 100+ brokers, familia 5 |
| Atlas Privacy | $10.50/mes | 150+ sitios |
| LifeLock | $30+/mes | Seguro $1M, familia |
| Aura | $32/mes | 5 adultos, familia |
| TraceLess Básico | $5 USD/mes | 3 brokers argentinos |
| TraceLess Familia | $15 USD/mes | 5 miembros |
| TraceLess Corporativo | $75 USD/mes | 25 empleados |

---

## Features futuras

### Mes 3-6
- [ ] Expansión a Uruguay, Chile, Colombia
- [ ] App móvil (React Native)
- [ ] Seguro contra robo de identidad (partner)
- [ ] Monitoreo crediticio (partner)
- [ ] VPN integrada
- [ ] Password manager

### Mes 6-12
- [ ] API para empresas (B2B)
- [ ] White-label para empresas
- [ ] Integración con bancos
- [ ] Monitoreo de redes sociales
- [ ] Alertas en tiempo real
