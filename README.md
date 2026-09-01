# TraceLess

**Facturación electrónica para monotributistas y Pymes argentinas.** Emisión directa a ARCA (ex AFIP), envío por WhatsApp, links de pago, recordatorios automáticos y dashboard de ingresos.

> **Estado:** En producción con clientes pagando. Deploy automático en Vercel + Supabase.

---

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS 4 + React Router 7 |
| **Backend** | FastAPI (Python 3.12) — serverless functions en Vercel |
| **Base de datos** | Supabase (PostgreSQL) con RLS |
| **Facturación** | ARCA WSFEv1 via `zeep` (SOAP) |
| **Pagos** | MercadoPago (checkout + webhooks + links de pago) |
| **Email** | Resend |
| **PDF** | WeasyPrint (HTML → PDF profesional) |
| **WhatsApp** | Meta Cloud API + wa.me fallback |
| **Deploy** | Vercel (monorepo: `/api` = FastAPI, `/frontend` = Vite) |
| **Cron jobs** | Vercel Cron (7 jobs programados) |

---

## 📁 Estructura del Proyecto

```
traceless/
├── app/                    # Backend FastAPI
│   ├── main.py            # App + routers + middlewares
│   ├── auth.py            # Auth (JWT, registro, login, reset, referidos)
│   ├── facturas.py        # Facturación ARCA, NC, reembolsos, PDF, WhatsApp facturador
│   ├── whatsapp.py        # Envío WhatsApp (Cloud API + wa.me)
│   ├── whatsapp_webhook.py # Webhook entrante + facturador por WhatsApp
│   ├── whatsapp_templates.py # Plantillas Meta aprobadas
│   ├── clientes.py        # CRUD clientes
│   ├── mercadopago.py     # Checkout, webhooks, links de pago
│   ├── lemon.py           # Planes (Free/Pro/Equipo) + límites
│   ├── pdf.py             # Generación HTML/PDF (WeasyPrint)
│   ├── afip.py            # Cliente SOAP ARCA + cache TA
│   ├── db.py              # Cliente Supabase (service_role + anon)
│   ├── notifications.py   # Notificaciones in-app + Telegram
│   ├── creditos.py        # Créditos prepagos WhatsApp
│   ├── retry_queue.py     # Cola reintentos ARCA (backoff exponencial)
│   ├── reembolsos.py      # Reembolsos con NC asociada
│   ├── backup.py          # Backup automático a Supabase Storage
│   └── ...
├── frontend/              # Frontend React + Vite
│   ├── src/
│   │   ├── pages/         # Landing, Dashboard, Facturas, Clientes, Perfil, etc.
│   │   ├── components/    # Carousel, FacturaForm, etc.
│   │   ├── lib/           # api.ts (cliente HTTP), utils
│   │   └── App.tsx        # Rutas + ProtectedRoute
│   └── public/carousel/   # Slides WebP (1300x650, 2:1)
├── migrations/            # SQL migrations para Supabase
│   └── 0002_wa_pending.sql
├── schema.sql             # Schema completo (ejecutar en Supabase SQL Editor)
├── vercel.json            # Config Vercel (build, rewrites, crons)
├── requirements.txt       # Python deps
├── .env.example           # Variables de entorno (copiar a .env)
└── README.md              # Este archivo
```

---

## 🗄️ Esquema de Base de Datos (Tablas Clave)

Ejecuta `schema.sql` en **Supabase Dashboard → SQL Editor** para crear todo. Las migraciones incrementales están en `migrations/`.

| Tabla | Propósito | RLS |
|-------|-----------|-----|
| `perfiles` | Extiende `auth.users`: datos fiscales, CBU/alias, config recordatorios, referidos | ✅ |
| `clientes` | Clientes del usuario (CUIT, IVA, dirección, teléfono) | ✅ |
| `facturas` | Facturas emitidas, NC, programadas, recurrentes. `tipo` (1/3/6/8/11/13/19/21), `estado`, `factura_original_id` para NC | ✅ |
| `facturas_pendientes` | Cola reintentos ARCA (backoff, max 5 intentos) | ✅ |
| `wa_pending` | Estado persistente del facturador WhatsApp (multi-paso serverless) | Solo `service_role` |
| `whatsapp_log` | Log de mensajes WhatsApp enviados (límites por plan) | ✅ |
| `creditos` | Créditos prepagos para mensajes extra WhatsApp | Solo `service_role` insert |
| `reembolsos` | Reembolsos con link a NC | ✅ |
| `notificaciones` | Centro de notificaciones in-app | ✅ |
| `cache` | Tokens ARCA TA, rate limiting, preapprovals MP | Solo `service_role` |
| `referral_codes` / `referral_uses` | Sistema de referidos (código + usos) | ✅ |

> **Importante:** El backend usa `SUPABASE_SERVICE_KEY` (service_role) que **bypasa RLS** para operaciones de sistema (webhooks, crons, facturador WhatsApp, cache).

---

## 🌐 API Endpoints (Resumen)

Base URL: `https://www.traceless.com.ar/api` (o `http://localhost:8000` en dev)

### Auth (`/auth`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro + verificación email |
| POST | `/auth/login` | Login → access + refresh token |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Solicitar reset |
| POST | `/auth/reset-password` | Confirmar reset |
| GET | `/auth/verify-email` | Verificar email (token) |
| POST | `/auth/referido` | Generar código propio |
| POST | `/auth/referido/aplicar` | Aplicar código ajeno |

### Facturas (`/facturas`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/facturas` | Listar (filtros: `cliente_id`, `estado`, `por_cobrar`) |
| POST | `/facturas` | Crear/emitir factura (ARCA) |
| POST | `/facturas/preview` | Preview sin emitir |
| GET | `/facturas/{id}/pdf` | PDF (WeasyPrint) |
| GET | `/facturas/{id}/public` | HTML público (cliente) |
| PUT | `/facturas/{id}/anular` | Anular factura |
| POST | `/facturas/nota-credito` | Emitir NC (anula original si monto total) |
| POST | `/facturas/reembolso` | Registrar reembolso + NC |
| POST | `/facturas/enviar-whatsapp` | Enviar factura por WhatsApp |
| POST | `/facturas/bulk-whatsapp` | Envío masivo seleccionadas |

### WhatsApp Webhook (`/whatsapp`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/whatsapp/webhook` | Verificación Meta (hub.challenge) |
| POST | `/whatsapp/webhook` | Mensajes entrantes + estados |

**Facturador por WhatsApp:** Usuario envía `"facturale a Ana $500"` → parsea → confirma cliente → confirma monto → emite factura ARCA → responde con PDF. Estado multi-paso persistido en `wa_pending` (TTL 60 min).

### Planes (`/planes`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/planes` | Catálogo planes + features del usuario |
| GET | `/api/usuario/plan` | Plan actual + contadores |

### Pagos MercadoPago (`/mercadopago`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/mercadopago/checkout` | Crear preferencia (plan o créditos) |
| POST | `/mercadopago/webhook` | Webhook pagos (verifica HMAC) |

### Cron Jobs (Vercel Cron → `/api/facturas/...`)
| Schedule | Endpoint | Función |
|----------|----------|---------|
| `0 10 * * *` | `/recordatorios` | Recordatorios cobro semanales (lunes) |
| `0 10 * * *` | `/recurrentes` | Generar facturas recurrentes |
| `0 10 20 * *` | `/recordatorio-monotributo` | Recordatorio cuota monotributo (día 20) |
| `0 8 * * *` | `/retry/process` | Procesar cola reintentos ARCA |
| `0 7 * * *` | `/procesar-programadas` | Emitir facturas programadas del día |
| `0 9 * * *` | `/verificar-certificados` | Alertar si cert ARCA próximo a vencer |
| `0 4 * * *` | `/backup` | Backup Supabase → Storage |

---

## ⚙️ Variables de Entorno

Copia `.env.example` → `.env` y completa valores reales.

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `SUPABASE_URL` | URL proyecto Supabase | ✅ |
| `SUPABASE_SERVICE_KEY` | Service role key (bypass RLS) | ✅ |
| `SUPABASE_ANON_KEY` | Anon key (frontend) | ✅ |
| `JWT_SECRET` | Firma access/refresh tokens | ✅ |
| `ARCA_CUIT` | CUIT emisor (sin guiones) | ✅ |
| `ARCA_CERT_PATH` | Ruta certificado .pem (ej: `certs/cert.pem`) | ✅ |
| `ARCA_KEY_PATH` | Ruta clave privada .pem | ✅ |
| `ARCA_ENV` | `produccion` o `homologacion` | ✅ |
| `ARCA_USE_REAL` | `1` = real, `0` = mock | ✅ |
| `ARCA_PUNTO_VENTA` | Punto de venta ARCA | ✅ |
| `MP_ACCESS_TOKEN` | Access token MercadoPago | ✅ |
| `MP_PUBLIC_KEY` | Public key (frontend) | ✅ |
| `MP_WEBHOOK_SECRET` | Secret validación webhook | ✅ |
| `WHATSAPP_TOKEN` | Token Meta Cloud API | Opcional* |
| `WHATSAPP_PHONE_ID` | Phone Number ID Meta | Opcional* |
| `WHATSAPP_APP_SECRET` | App Secret (firma webhook) | Opcional* |
| `WHATSAPP_VERIFY_TOKEN` | Token verificación webhook | Opcional* |
| `WA_TEMPLATE_INVOICE` | Nombre plantilla factura (Meta) | Opcional |
| `WA_TEMPLATE_REMINDER` | Nombre plantilla recordatorio | Opcional |
| `WA_TEMPLATE_MONOTRIBUTO` | Nombre plantilla monotributo | Opcional |
| `RESEND_API_KEY` | API Key Resend | ✅ |
| `RESEND_FROM` | Remitente emails | ✅ |
| `CONTACT_EMAIL` | Destino formulario contacto | ✅ |
| `ADMIN_EMAILS` | Emails con plan Equipo gratis (coma-separados) | No |
| `CRON_SECRET` | Secret Vercel Cron (header `x-cron-secret`) | ✅ |
| `TELEGRAM_NOTIFIER_URL` | Webhook notificaciones errores | No |
| `TRACLESS_SERVICE_API_KEY` | API key server-to-server | No |
| `OPERATIVA_WEBHOOK_URL/KEY` | Integración OperativaAI | No |
| `BASE_URL` | `https://www.traceless.com.ar` | ✅ |
| `CORS_ORIGINS` | Orígenes permitidos (coma-separados) | ✅ |

> *WhatsApp Cloud API es opcional: sin credenciales usa `wa.me` (gratis, abre chat del usuario).

---

## 💻 Desarrollo Local

### Prerrequisitos
- Python 3.12+
- Node.js 20+
- Cuenta Supabase (proyecto creado)
- Certificados ARCA (`.pem` en `certs/`) o usar `ARCA_USE_REAL=0` para mock

### 1. Backend
```bash
cd /home/alejandro/Escritorio/Proyectos/traceless
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env con valores reales
uvicorn app.main:app --reload --port 8000
```
API en `http://localhost:8000`, docs en `http://localhost:8000/docs`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend en `http://localhost:5173` (proxy a `/api` → backend).

### 3. Test Webhook WhatsApp Local (ngrok)
```bash
ngrok http 8000
# Configurar en Meta: Webhook URL = https://<tu-ngrok>.ngrok-free.app/api/whatsapp/webhook
# Verify Token = WHATSAPP_VERIFY_TOKEN
```

---

## 🚀 Deploy en Producción (Vercel)

### Configuración única
1. Conectar repo GitHub a Vercel
2. Root Directory: `/` (monorepo)
3. Build Command: `cd frontend && npm install && npm run build`
4. Output Directory: `frontend/dist`
5. Environment Variables: agregar todas las de `.env` en Vercel Dashboard
6. `vercel.json` ya incluido (rewrites, crons)

### Deploy manual
```bash
cd /home/alejandro/Escritorio/Proyectos/traceless
vercel --prod --yes
```
> Usa el binario nativo: `~/.npm/_npx/.../vercel` si `npx vercel` falla.

### Alias productivos
- `https://www.traceless.com.ar`
- `https://traceless.com.ar`

---

## 🧪 Testing

```bash
# Backend tests (pytest)
cd /home/alejandro/Escritorio/Proyectos/traceless
source venv/bin/activate
pytest tests/ -v

# Frontend build check
cd frontend && npm run build

# Lint / typecheck (si configurado)
# npm run lint && npm run typecheck
```

### Test WhatsApp facturador (solo Alejandro)
- Número autorizado: `5491158210746`
- Enviar al número de TraceLess: `"facturale a Ana $500"`

---

## 📋 Migraciones de Base de Datos

| Archivo | Qué hace | Cómo aplicar |
|---------|----------|--------------|
| `schema.sql` | Schema completo (tablas, RLS, índices) | Supabase SQL Editor → pegar y ejecutar |
| `migrations/0002_wa_pending.sql` | Tabla `wa_pending` para facturador WhatsApp | Supabase SQL Editor (una vez) |
| `migration_referrals.sql` | Tablas `referral_codes`, `referral_uses` | Supabase SQL Editor |
| `migration_arca_per_user.sql` | Config ARCA por usuario (certificados) | Supabase SQL Editor |

> **Regla:** Nunca modificar `schema.sql` después de producción. Crear nuevo archivo en `migrations/` con nombre incremental (`0003_...sql`).

---

## 🔐 Seguridad

- **Auth:** JWT (access 15min + refresh 7d) con rotación automática. Rate limit login (5 req/5min).
- **Passwords:** bcrypt (mín 8 chars, 1 mayúscula, 1 número).
- **Webhooks:** HMAC verification (MercadoPago, LemonSqueezy). WhatsApp `x-hub-signature-256` (actualmente log warning, no bloquea).
- **CORS:** Whitelist `CORS_ORIGINS` (solo `traceless.com.ar` en prod).
- **RLS:** Todas las tablas usuario habilitan Row Level Security. Backend usa `service_role` para operaciones de sistema.
- **Locks por usuario:** `threading.Lock` en `facturas.py` para prevenir race conditions en numeración y créditos.
- **HTML Sanitization:** `html.escape` en generación PDF y formulario contacto.
- **Error handling:** Excepciones internas → log + respuesta genérica (no filtran stack traces).

---

## 📦 Características Principales (Resumen Ejecutivo)

### Facturación ARCA
- Tipos A, B, C, E + NC (3, 8, 13, 21)
- CAE tiempo real, cola reintentos exponencial (max 5, 5/15/60/300/900s)
- PDF profesional con QR pago, branding, datos bancarios
- Numeración correlativa por punto de venta + lock por usuario

### WhatsApp Facturador (Plan Equipo)
- **Comando:** `"facturale a [cliente] $[monto]"`
- Flujo multi-paso: parsea → busca cliente → confirma → emite → responde PDF
- Estado persistido en `wa_pending` (supabase, TTL 60min, sobrevive a cold starts)
- Gate: solo plan **Equipo** (`whatsapp_facturador: true`)

### Envío WhatsApp Dual
- **wa.me** (gratis, por defecto): abre chat con mensaje prellenado + pitch TraceLess
- **Cloud API** (opcional): envío 100% automático, requiere plantillas Meta aprobadas
- Límite mensual por plan (Pro: 100, Equipo: 250, extra: $60-70/msg)

### Recordatorios Automáticos
- **Cobro:** Lunes → facturas impagas. Día 30 → "vencida" + mensaje intensificado.
- **Monotributo:** Día 20/mes (planes pagos).
- **Opt-out:** Usuario responde "ALTO/PARAR/STOP" → desactiva todos.
- Configuración granular en Perfil (3 toggles independientes).

### Pagos MercadoPago
- Links de pago automáticos por factura (webhook registra pago → estado "pagada")
- Checkout planes (Pro/Equipo) + compra créditos WhatsApp
- Webhook verifica HMAC + idempotencia

### Dashboard & Analytics
- Resumen mensual/anual, comparativa vs mes anterior
- Analytics clientes (Pro/Equipo): ranking, frecuencia, atraso promedio
- Exportación Excel (filtros fecha)

### Planes (Precios USD, facturación ARS)
| Plan | Precio | Facturas/mes | WhatsApp API | Msgs incl. | Extra/msg | Facturador WhatsApp | Multi-user |
|------|--------|-------------|--------------|------------|-----------|---------------------|------------|
| Gratis | $0 | 20 | ❌ | - | - | ❌ | ❌ |
| Profesional | USD 12 | Ilimitado | ✅ | 100 | $70 | ❌ | ❌ |
| Equipo | USD 22 | Ilimitado | ✅ | 250 | $60 | ✅ | ✅ |

> **Nota:** Precios en USD, facturación en ARS al dólar blue/MEP del día.

---

## 📝 Changelog Reciente (Sept 2026)

| Fecha | Cambio |
|-------|--------|
| 2026-09-01 | **WhatsApp facturador:** menú inicial ante cualquier mensaje, botón Volver PDF arreglado, NC etiquetada "Nota de crédito NC X", filtro "por cobrar" excluye NCs/anuladas, botones Anular/NC/Reembolso ocultos en NCs |
| 2026-08-31 | **Referidos:** endpoints reescritos usando `referral_codes`/`referral_uses` (código GISELA2026, TR657F73) |
| 2026-08-30 | **Asistente impositivo:** fix "Monotributista" → detecta "monotribut" substring |
| 2026-08-28 | **Carrusel:** slide 3 (WhatsApp facturador) ratio 2:1, WebP-only, esquinas uniformes |
| 2026-08-25 | **Notas de crédito:** `wa_pending` migración a Supabase (persistencia serverless) |
| 2026-08-20 | **Web Monotributista:** flujo completo factura Monotributo Social Cat A |

---

## 🛠️ Comandos Útiles

```bash
# Ver logs Vercel
vercel logs <deployment-url>

# Inspeccionar deployment
vercel inspect <deployment-url>

# Ejecutar migración SQL en Supabase (copiar/pegar en SQL Editor)
cat migrations/0002_wa_pending.sql

# Backup manual
curl -X POST https://www.traceless.com.ar/api/backup \
  -H "Authorization: Bearer $CRON_SECRET"

# Probar webhook WhatsApp local
ngrok http 8000
# POST a https://xxx.ngrok-free.app/api/whatsapp/webhook con body Meta
```

---

## 📞 Soporte y Contacto

- **Email:** soporte@traceless.com.ar (respuesta inmediata 😉)
- **Formulario web:** `/contact`
- **Telegram notificaciones:** Configurar `TELEGRAM_NOTIFIER_URL` para alertas de errores 500

---

## 📄 Licencia

Proyecto privado — TraceLess © 2026. Todos los derechos reservados.