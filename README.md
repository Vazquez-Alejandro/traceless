# TraceLess

App para monotributistas que facilita la facturación electrónica y el seguimiento de ingresos. No controla, ayuda.

## Features

### Facturación Electrónica con ARCA
Emisión de facturas (A, B, C) conectadas directamente al Web Service de ARCA (AFIP). Se obtiene el CAE en tiempo real, se guarda el comprobante y se genera el PDF automáticamente. Si ARCA no responde, la factura queda en cola y se emite automáticamente cuando vuelva (cola de reintentos con backoff exponencial).

### PDF Real
Descarga de facturas en formato PDF profesional con datos del emisor, cliente, detalles, QR de pago y branding de TraceLess. Generado con WeasyPrint.

### Envío por WhatsApp (Dual)
Las facturas se envían por WhatsApp al cliente al emitirlas. Dos modos:
- **wa.me (por defecto):** Sin configuración. Abre el chat de WhatsApp con el mensaje y PDF listo para enviar. Incluye pitch publicitario de TraceLess.
- **API Cloud (opcional):** Envío directo desde la app sin redirigir. Requiere configurar credenciales de Meta. Próximamente.

### Envío Masivo de Facturas
Selección múltiple de facturas con tildes y "seleccionar todas". Un solo botón envía todas las seleccionadas a sus clientes correspondientes.

### Links de Pago MercadoPago
Cada factura genera automáticamente un link de pago de MercadoPago. El cliente puede pagar online con tarjeta o transferencia. Los pagos se registran automáticamente via webhook (con verificación HMAC).

### QR para Pago Presencial
Cuando el usuario configura CBU y alias en su perfil, se genera un código QR en la factura con los datos para transferencia bancaria. El cliente escanea y paga desde su app de banco. Recordatorio visible si no está configurado.

### Créditos Prepagos
Sistema de créditos para mensajes extra de WhatsApp. El usuario compra créditos vía MercadoPago y se descuentan automáticamente al enviar mensajes fuera del límite de su plan. Se envía una alerta por email cuando quedan menos de 10 créditos disponibles.

### Dashboard de Ingresos
Resumen amigable de lo que facturás: total del mes, comparación con el mes anterior, total del año y cantidad de facturas emitidas. Sin juzgar, solo informar.

### Historial de Clientes
Registro de clientes con datos fiscales (CUIT, condición de IVA, dirección). Historial de facturas por cliente con seguimiento de pagos. Creación rápida de clientes desde el formulario de facturas. Importación masiva de clientes.

### Recordatorios de Cobro
Cada lunes se envían recordatorios por WhatsApp a clientes con facturas impagas. A los 30 días se intensifica el mensaje y la factura pasa a estado "vencida". Los usuarios pueden activar/desactivar recordatorios desde su perfil, o responder "ALTO" en WhatsApp para desuscribirse.

### Recordatorio de Monotributo
El día 20 de cada mes se envía un recordatorio por WhatsApp a usuarios con plan pagado para que no olviden pagar la cuota del monotributo. Configurable desde el perfil.

### Facturas Recurrentes
Generación automática de facturas periódicas. Se configura una factura recurrente y se emite automáticamente según la frecuencia definida. Si falla, se envía alerta por WhatsApp.

### Facturas Programadas
Al crear una factura, se puede programar el envío para una fecha futura. La factura se guarda como "programada" y se emite automáticamente en la fecha seleccionada (respetando el límite de ±10 días de ARCA).

### Factura Pública (HTML)
Cada factura tiene un link público que muestra la factura en formato HTML limpio, con datos del emisor, detalle de items, totales, QR de pago y link de MercadoPago. Incluye branding de TraceLess.

### Exportación a Excel
Exportación de facturas a formato .xlsx para tener un respaldo local o compartir con un contador. Filtros por rango de fechas.

### Analytics de Clientes
Dashboard con estadísticas por cliente: facturas emitidas, montos totales, frecuencia de pago, ranking de mejores clientes. Disponible en plan Profesional y Equipo.

### Formulario de Contacto
Página de contacto pública (`/contact`) para que los usuarios envíen consultas o reporten problemas. Los mensajes llegan por email vía Resend a soporte@traceless.com.ar.

### Verificación de Email
Flujo completo de registro con verificación de email vía Resend. Incluye reenvío de verificación y reseteo de contraseña.

### Onboarding
Overlay de bienvenida con 4 pasos visuales que se muestra una sola vez después del registro. Explica las features principales de la app. Solo se marca como completado cuando el usuario termina el tour.

### PWA (Progressive Web App)
Se puede instalar como app nativa desde el navegador. Funciona offline para assets estáticos. Manifest.json con íconos y colores de tema.

### Token Refresh Automático
La sesión del usuario se renueva automáticamente cuando el access token expira. Si el refresh falla, se redirige a login. Requests concurrentes durante el refresh se encolan y reintentan.

### Seguridad
- Contraseña: mínimo 8 caracteres, 1 mayúscula, 1 número
- Confirmación de contraseña en registro y reset
- Rate limiting en login (5 intentos, bloqueo de 5 minutos)
- Webhook de MercadoPago con verificación HMAC
- Webhook de LemonSqueezy rechazado si no hay secret configurado
- CORS whitelist (solo orígenes permitidos)
- HTML sanitizado en contact form y generación de PDF
- Errores internos no se filtran al cliente
- Locks por usuario para prevenir race conditions en facturas y créditos

### Anti-Spam y Control de Recordatorios
Los usuarios tienen control total sobre los recordatorios por WhatsApp:
- **Opt-in:** Los recordatorios están activados por defecto, pero el usuario puede desactivarlos desde su perfil
- **Opt-out por WhatsApp:** Responder "ALTO", "PARAR", "STOP" o "CANCELAR" a cualquier mensaje de recordatorio desactiva todos los recordatorios automáticamente
- **Configuración granular:** Tres tipos de recordatorios independientes: cobro, monotributo y vencidas
- **Límite de frecuencia:** Máximo 1 recordatorio por semana por factura

### Planes y Pagos con MercadoPago
Sistema de planes (Gratis, Profesional, Equipo) con límites de facturación y acceso a features premium. Los planes se pagan a través de MercadoPago con checkout y activación automática por webhook.

| Plan | Precio | Facturas/mes | WhatsApp API | Mensajes incluidos | Costo extra/msg |
|------|--------|-------------|--------------|-------------------|-----------------|
| Gratis | $0 | 5 | No | - | - |
| Profesional | $15.000/mes | Ilimitado | Sí | 100 | $70 |
| Equipo | $29.000/mes | Ilimitado | Sí | 250 | $60 |

### Admin Bypass
Los emails en `ADMIN_EMAILS` siempre obtienen plan Equipo sin pagar. Útil para testing y demostraciones.

### Perfil de Usuario
Configuración del perfil fiscal: CUIT, nombre, dirección, condición de IVA, teléfono, empresa, logo, email fiscal, condiciones de venta. Datos de cuenta bancaria (CBU, alias) para QR de pago. Estos datos se usan automáticamente al emitir facturas.

### Cache de Planes
Los planes se cachean en memoria (5 min TTL) para evitar llamadas HTTP repetidas a Supabase. Mejora el rendimiento en endpoints que consultan el plan múltiples veces.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python 3.12)
- **Base de datos:** Supabase (PostgreSQL)
- **Facturación:** ARCA WSFEv1 (zeep)
- **Pagos:** MercadoPago
- **Email:** Resend
- **PDF:** WeasyPrint
- **WhatsApp:** Meta Cloud API / wa.me
- **Deploy:** Vercel

## Variables de Entorno

### Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_ANON_KEY`

### ARCA (Facturación Electrónica)
- `ARCA_ENV` (produccion / homologacion)
- `ARCA_CUIT`
- `ARCA_CERT_B64` (certificado en base64)
- `ARCA_KEY_B64` (clave privada en base64)
- `ARCA_PUNTO_VENTA`

### MercadoPago (Pagos)
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`

### WhatsApp (Opcional)
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_ID`
- `WHATSAPP_VERIFY_TOKEN`

### Resend (Email)
- `RESEND_API_KEY`
- `RESEND_FROM`

### Otros
- `JWT_SECRET`
- `VERIFY_SECRET`
- `CRON_SECRET`
- `BASE_URL`
- `CONTACT_EMAIL`
- `CORS_ORIGINS` (separado por comas, default: `https://www.traceless.com.ar,https://traceless.com.ar`)
