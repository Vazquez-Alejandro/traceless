create table if not exists creditos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monto numeric(10,2) not null,
  tipo text not null default 'compra',
  descripcion text default '',
  created_at timestamptz default now()
);

alter table creditos enable row level security;

create policy "Usuarios pueden ver sus creditos"
  on creditos for select using (auth.uid() = user_id);

create policy "Sistema puede insertar creditos"
  on creditos for insert with check (true);
