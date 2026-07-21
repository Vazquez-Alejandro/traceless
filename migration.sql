-- Migration: WhatsApp log + Facturas pendientes ARCA
-- Pegar esto en el SQL Editor de Supabase

-- WhatsApp log
create table if not exists whatsapp_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  factura_id uuid,
  tipo text default 'factura',
  created_at timestamptz default now()
);

alter table whatsapp_log enable row level security;

do $$ begin
  create policy "Usuarios pueden ver su propio log de WhatsApp"
    on whatsapp_log for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Sistema puede insertar logs de WhatsApp"
    on whatsapp_log for insert with check (true);
exception when duplicate_object then null;
end $$;

-- Facturas pendientes de reintento ARCA
create table if not exists facturas_pendientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo int not null default 6,
  importe numeric(12,2) not null,
  descripcion text default 'Honorarios',
  detalles jsonb default '[]',
  recurrente boolean default false,
  intentos int default 0,
  max_intentos int default 5,
  ultimo_error text default '',
  estado text default 'pendiente',
  proximo_reintento timestamptz default now(),
  created_at timestamptz default now()
);

alter table facturas_pendientes enable row level security;

do $$ begin
  create policy "Usuarios pueden ver sus facturas pendientes"
    on facturas_pendientes for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Sistema puede gestionar facturas pendientes"
    on facturas_pendientes for all using (true);
exception when duplicate_object then null;
end $$;
