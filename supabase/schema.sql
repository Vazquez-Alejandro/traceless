-- Tabla de usuarios (sincronizada desde Clerk via webhook)
create table if not exists users (
  id text primary key,
  email text not null,
  name text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text check (subscription_status in ('active', 'canceled', 'past_due')),
  period_end timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Búsquedas realizadas
create table if not exists searches (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  email text not null,
  result jsonb,
  created_at timestamp default now()
);

create index if not exists idx_searches_user_id on searches(user_id);
create index if not exists idx_searches_created_at on searches(created_at);

-- Cartas de baja generadas
create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  breach_id text not null,
  email text not null,
  created_at timestamp default now()
);

create index if not exists idx_letters_user_id on letters(user_id);
create index if not exists idx_letters_created_at on letters(created_at);

-- Suscripciones de monitoreo
create table if not exists monitoring (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  email text not null,
  active boolean default true,
  last_checked_at timestamp,
  next_check_at timestamp default now(),
  created_at timestamp default now()
);

create index if not exists idx_monitoring_user_id on monitoring(user_id);
create index if not exists idx_monitoring_next_check on monitoring(next_check_at) where active = true;
