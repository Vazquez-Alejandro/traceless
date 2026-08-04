alter table perfiles add column if not exists empresa text default '';
alter table perfiles add column if not exists logo_url text default '';
alter table perfiles add column if not exists email_fiscal text default '';
alter table perfiles add column if not exists condiciones_venta text default '';
alter table perfiles add column if not exists recordatorios_whatsapp boolean default true;
alter table perfiles add column if not exists recordatorio_monotributo boolean default true;
alter table perfiles add column if not exists recordatorio_vencidas boolean default true;

-- Notas de crédito: link a factura original
alter table facturas add column if not exists factura_original_id uuid references facturas(id) on delete set null;

-- Tabla de reembolsos
create table if not exists reembolsos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  factura_id uuid not null references facturas(id) on delete cascade,
  nota_credito_id uuid references facturas(id) on delete set null,
  monto numeric(12,2) not null,
  metodo text not null default 'transferencia',
  referencia text default '',
  fecha text not null,
  estado text default 'completado',
  notas text default '',
  created_at timestamptz default now()
);

alter table reembolsos enable row level security;

create policy "Usuarios pueden ver sus reembolsos"
  on reembolsos for select using (auth.uid() = user_id);

create policy "Usuarios pueden crear reembolsos"
  on reembolsos for insert with check (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus reembolsos"
  on reembolsos for delete using (auth.uid() = user_id);

create index if not exists idx_reembolsos_user on reembolsos(user_id);
create index if not exists idx_reembolsos_factura on reembolsos(factura_id);
