# TraceLess

App para monotributistas que facilita la facturación electrónica y el seguimiento de ingresos. No controla, ayuda.

## Features

### Facturación Electrónica con ARCA
Emisión de facturas (A, B, C, E) conectadas directamente al Web Service de ARCA (AFIP). Se obtiene el CAE en tiempo real, se guarda el comprobante y se genera el PDF automáticamente.

### Envío por WhatsApp
Las facturas se envían automáticamente por WhatsApp al cliente al emitirlas. Incluye el PDF y un mensaje con el número de factura, el total y el vencimiento del CAE.

### Dashboard de Ingresos
Resumen amigable de lo que facturás: total del mes, comparación con el mes anterior, total del año y cantidad de facturas emitidas. Sin juzgar, solo informar.

### Historial de Clientes
Registro de clientes con datos fiscales (CUIT, condición de IVA, dirección). Historial de facturas por cliente con seguimiento de pagos: cuánto paga, si paga a tiempo o con atraso.

### Recordatorios de Cobro
Cada lunes se envían recordatorios por WhatsApp a clientes con facturas impagas. A los 30 días se intensifica el mensaje y la factura pasa a estado "vencida".

### Recordatorio de Monotributo
El día 20 de cada mes se envía un recordatorio por WhatsApp a usuarios con plan pagado para que no olviden pagar la cuota del monotributo.

### Facturas Recurrentes
Generación automática de facturas periódicas. Se configura una factura recurrente y se emite automáticamente según la frecuencia definida.

### Exportación a Excel
Exportación de facturas a formato .xlsx para tener un respaldo local o compartir con un contador.

### Planes y Pagos con Lemon Squeezy
Sistema de planes (Free, Basic, Pro, PyME, Corporate) con límites de facturación y acceso a WhatsApp. Los planes se pagan a través de Lemon Squeezy con checkout externo y activación automática por webhook.

### Planes

| Plan | Precio | Facturas/mes | WhatsApp |
|------|--------|-------------|----------|
| Free | $0 | 3 | No |
| Basic | $9/mes | 50 | Sí |
| Pro | $19/mes | Ilimitadas | Sí |
| PyME | $29/mes | Ilimitadas | Sí |
| Corporate | $99/mes | Ilimitadas | Sí |

### Perfil de Usuario
Configuración del perfil fiscal: CUIT, nombre, dirección, condición de IVA, teléfono. Estos datos se usan automáticamente al emitir facturas.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python 3.12)
- **Base de datos:** Supabase (PostgreSQL)
- **Facturación:** ARCA WSFEv1 (zeep)
- **Pagos:** Lemon Squeezy
- **WhatsApp:** Meta Cloud API
- **Deploy:** Vercel

## Variables de Entorno

### Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### ARCA (Facturación Electrónica)
- `ARCA_ENV` (produccion / homologacion)
- `ARCA_CUIT`
- `ARCA_CERT_B64` (certificado en base64)
- `ARCA_KEY_B64` (clave privada en base64)
- `ARCA_PUNTO_VENTA`

### Lemon Squeezy (Pagos)
- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `LEMON_STORE_ID`
- `LEMON_VARIANT_BASIC`
- `LEMON_VARIANT_PRO`
- `LEMON_VARIANT_PYME`
- `LEMON_VARIANT_CORPORATE`

### WhatsApp
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_ID`

### Otros
- `CRON_SECRET` (para crons de Vercel)
- `BASE_URL`
