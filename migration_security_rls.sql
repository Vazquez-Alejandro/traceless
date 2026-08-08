-- Migration: Seguridad RLS (auditoría 2026-08-07)
-- Ejecutar en Supabase SQL Editor (project traceless) + actualizar el entorno Previews/Production luego.

-- =====================================================
-- 1) cache: habilitar RLS, SIN políticas públicas, y revocar
--    acceso a anon/authenticated (guarda tokens ARCA/AFIP + rate-limit)
--    El backend la usa con service_role (bypasa RLS).
-- =====================================================
alter table cache enable row level security;
revoke all on table cache from anon, authenticated;

-- =====================================================
-- 2) creditos: los INSERT los hace SOLO el backend (service_role).
--    No debe existir ninguna política de insert para el rol public/anon,
--    ni poder un usuario autolograrse créditos. El dueño solo ve los suyos.
--    (Si existía la política publica "Sistema puede insertar", se elimina.)
-- =====================================================
drop policy if exists "Sistema puede insertar creditos" on creditos;

-- =====================================================
-- 3) facturas_pendientes: el backend gestiona la cola; el usuario no
--    debe poder insertar/modificar filas que no le pertenecen.
--    Se elimina la política con "for all using (true)".
--    Backend = service_role (bypasa RLS), así no necesita políticas de insert.
-- =====================================================
drop policy if exists "Sistema puede gestionar facturas pendientes" on facturas_pendientes;

-- =====================================================
-- 4) whatsapp_log: el INSERT lo hace el backend; el usuario solo lee los suyos.
-- =====================================================
drop policy if exists "Sistema puede insertar whatsapp_log" on whatsapp_log;

-- =====================================================
-- 5) perfiles: el update del usuario restringido a su fila.
--    (por seguridad con check explícito)
-- =====================================================
drop policy if exists "Usuarios pueden actualizar su perfil" on perfiles;
create policy "Usuarios pueden actualizar su perfil"
  on perfiles for update using (auth.uid() = id) with check (auth.uid() = id);