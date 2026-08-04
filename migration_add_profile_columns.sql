alter table perfiles add column if not exists empresa text default '';
alter table perfiles add column if not exists logo_url text default '';
alter table perfiles add column if not exists email_fiscal text default '';
alter table perfiles add column if not exists condiciones_venta text default '';
alter table perfiles add column if not exists recordatorios_whatsapp boolean default true;
alter table perfiles add column if not exists recordatorio_monotributo boolean default true;
alter table perfiles add column if not exists recordatorio_vencidas boolean default true;
