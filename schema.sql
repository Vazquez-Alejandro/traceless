-- TraceLess — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Perfiles (extends auth.users)
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null default '',
  cuit text default '',
  direccion text default '',
  condicion_iva text default 'Responsable Inscripto',
  telefono text default '',
  created_at timestamptz default now()
);

alter table perfiles enable row level security;

create policy "Usuarios pueden ver su propio perfil"
  on perfiles for select using (auth.uid() = id);

create policy "Usuarios pueden actualizar su propio perfil"
  on perfiles for update using (auth.uid() = id);

-- Clientes
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null default '',
  email text default '',
  telefono text default '',
  cuit text default '',
  direccion text default '',
  condicion_iva text default 'Responsable Inscripto',
  created_at timestamptz default now()
);

alter table clientes enable row level security;

create policy "Usuarios pueden ver sus clientes"
  on clientes for select using (auth.uid() = user_id);

create policy "Usuarios pueden crear clientes"
  on clientes for insert with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus clientes"
  on clientes for update using (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus clientes"
  on clientes for delete using (auth.uid() = user_id);

-- Facturas
create table if not exists facturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo int not null default 6,
  numero text not null,
  cae text not null,
  cae_vencimiento text,
  neto numeric(12,2) default 0,
  iva numeric(12,2) default 0,
  total numeric(12,2) not null,
  descripcion text default '',
  fecha text not null,
  pdf_url text default '',
  estado text default 'emitida',
  created_at timestamptz default now()
);

alter table facturas enable row level security;

create policy "Usuarios pueden ver sus facturas"
  on facturas for select using (auth.uid() = user_id);

create policy "Usuarios pueden crear facturas"
  on facturas for insert with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus facturas"
  on facturas for update using (auth.uid() = user_id);

-- Indices
create index if not exists idx_clientes_user on clientes(user_id);
create index if not exists idx_facturas_user on facturas(user_id);
create index if not exists idx_facturas_cliente on facturas(cliente_id);
