-- Identidad fiscal por usuario (ARCA): cada usuario podrá cargar su propio
-- CUIT, certificado digital y punto de venta para emitir comprobantes con
-- su impresión fiscal, sin depender de una identidad global.

alter table perfiles add column if not exists arca_cuit text default '';
alter table perfiles add column if not exists arca_cert text default '';
alter table perfiles add column if not exists arca_key text default '';
alter table perfiles add column if not exists arca_punto_venta int default 2;
alter table perfiles add column if not exists arca_env text default 'produccion';
alter table perfiles add column if not exists arca_validado boolean default false;
alter table facturas add column if not exists es_fiscal boolean default true;