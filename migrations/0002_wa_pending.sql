-- Migration 0002: Estado persistente del facturador por WhatsApp
-- Reemplaza el archivo temporal /tmp/traceless_wa_pending.json (perdido en serverless)
-- Ejecutar en Supabase Dashboard > SQL Editor (una sola vez).

create table if not exists public.wa_pending (
    id          uuid primary key default gen_random_uuid(),
    phone       text unique not null,
    uid         uuid not null,
    data        jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null
);

create index if not exists wa_pending_phone_idx on public.wa_pending (phone);
create index if not exists wa_pending_expires_idx on public.wa_pending (expires_at);

alter table public.wa_pending enable row level security;

-- La app usa la service key (service_role), que bypasea RLS.
-- Sin policy, solo service_role/owner puede leer/escribir.