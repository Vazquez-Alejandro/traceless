"""
Backup diario de las tablas de TraceLess a un bucket privado de Supabase Storage.

Se invoca desde un cron de Vercel (una vez por día). Exporta todas las tablas
de negocio a un JSON comprimido y lo sube como objeto versionado por fecha.
"""

import os
import json
import gzip
import io
import httpx
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header

from app.db import supabase, _URL, _SERVICE_KEY

logger = logging.getLogger("backup")

router = APIRouter(prefix="/api", tags=["backup"])

BUCKET = os.getenv("BACKUP_BUCKET", "traceless-backups")

TABLAS = [
    "perfiles",
    "clientes",
    "facturas",
    "whatsapp_log",
    "facturas_pendientes",
    "creditos",
    "notificaciones",
    "cache",
    "reembolsos",
    "referral_codes",
    "referral_uses",
]

MAX_ROWS = int(os.getenv("BACKUP_MAX_ROWS", "50000"))


def _validar(secret: str, authorization: str):
    esperado = os.getenv("CRON_SECRET", "")
    if not esperado:
        raise HTTPException(403, "Backup deshabilitado")
    if authorization.replace("Bearer ", "").strip() != esperado and secret != esperado:
        raise HTTPException(403, "No autorizado")


def _asegurar_bucket() -> bool:
    """Crea el bucket privado si no existe."""
    try:
        r = httpx.get(
            f"{_URL}/storage/v1/bucket/{BUCKET}",
            headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"},
            timeout=10,
        )
        if r.status_code == 200:
            return True
        r2 = httpx.post(
            f"{_URL}/storage/v1/bucket",
            headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
            json={"id": BUCKET, "name": BUCKET, "public": False},
            timeout=10,
        )
        return r2.status_code in (200, 201, 400)  # 400 = ya existe
    except Exception as e:
        logger.error(f"Error asegurando bucket: {e}")
        return False


def _exportar_tablas() -> dict:
    data = {"generado": datetime.now(timezone.utc).isoformat(), "tablas": {}}
    for t in TABLAS:
        try:
            res = supabase.table(t).select("*").limit(MAX_ROWS).execute()
            filas = res.data if res.data is not None else []
            if res.count and res.count > len(filas):
                logger.warning(f"Tabla {t}: exportadas {len(filas)} de {res.count} filas (límite)")
            data["tablas"][t] = filas
        except Exception as e:
            logger.error(f"Error exportando {t}: {e}")
            data["tablas"][t] = []
    return data


def _subir(dump: bytes, nombre: str) -> bool:
    url = f"{_URL}/storage/v1/object/{BUCKET}/{nombre}"
    r = httpx.post(
        url,
        headers={
            "apikey": _SERVICE_KEY,
            "Authorization": f"Bearer {_SERVICE_KEY}",
            "Content-Type": "application/gzip",
        },
        content=dump,
        timeout=120,
    )
    return r.status_code in (200, 201)


@router.get("/backup")
async def backup(secret: str = "", authorization: str = Header("")):
    _validar(secret, authorization)

    if not _asegurar_bucket():
        raise HTTPException(500, "No se pudo crear/acceder al bucket de backup")

    data = _exportar_tablas()
    total = sum(len(v) for v in data["tablas"].values())

    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb") as gz:
        gz.write(json.dumps(data, ensure_ascii=False, default=str).encode("utf-8"))
    dump = buf.getvalue()

    nombre = f"traceless-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json.gz"
    ok = _subir(dump, nombre)

    try:
        from app.telegram_notify import notify_telegram
        import asyncio
        asyncio.create_task(notify_telegram(
            app="traceless",
            event="🗄️ Backup diario",
            message=f"{'✔' if ok else '✘'} {nombre} — {total} filas, {len(dump)//1024} KB"
            if ok else f"✘ Falló el upload de {nombre}",
        ))
    except Exception:
        pass

    if not ok:
        raise HTTPException(500, "El dump se generó pero falló subirlo al storage")
    return {"ok": True, "archivo": nombre, "filas": total, "bytes": len(dump)}
