import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Header, HTTPException
from app.db import supabase, _URL, _SERVICE_KEY
import httpx

logger = logging.getLogger("retry_queue")

router = APIRouter(prefix="/api/retry", tags=["retry"])


def queue_factura(user_id: str, cliente_id: str, tipo: int, importe: float,
                  descripcion: str = "Honorarios", detalles: list = None,
                  recurrente: bool = False, error: str = ""):
    supabase.table("facturas_pendientes").insert({
        "user_id": user_id,
        "cliente_id": cliente_id,
        "tipo": tipo,
        "importe": importe,
        "descripcion": descripcion,
        "detalles": detalles or [],
        "recurrente": recurrente,
        "ultimo_error": error,
        "estado": "pendiente",
        "proximo_reintento": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
    }).execute()
    logger.info(f"Factura encolada para reintento: user={user_id}, tipo={tipo}, importe={importe}")


def process_pending_retries():
    now = datetime.now(timezone.utc).isoformat()
    pending = supabase.table("facturas_pendientes") \
        .select("*") \
        .eq("estado", "pendiente") \
        .lte("proximo_reintento", now) \
        .order("created_at") \
        .limit(10) \
        .execute()

    results = {"processed": 0, "success": 0, "failed": 0, "permanently_failed": 0}

    for factura in (pending.data or []):
        results["processed"] += 1
        fid = factura["id"]
        intentos = factura.get("intentos", 0)
        max_intentos = factura.get("max_intentos", 5)

        if intentos >= max_intentos:
            supabase.table("facturas_pendientes") \
                .update({"estado": "fallido"}) \
                .eq("id", fid) \
                .execute()
            results["permanently_failed"] += 1
            logger.warning(f"Factura {fid} falló permanentemente tras {intentos} intentos")
            continue

        try:
            from app.facturas import _crear_factura_interna
            from app.facturas import FacturaCreate, DetalleItem

            detalles_models = []
            for d in (factura.get("detalles") or []):
                if isinstance(d, dict):
                    detalles_models.append(DetalleItem(**d))
                else:
                    detalles_models.append(d)

            req = FacturaCreate(
                cliente_id=factura["cliente_id"],
                tipo=factura["tipo"],
                importe=factura["importe"],
                descripcion=factura.get("descripcion", "Honorarios"),
                detalles=detalles_models,
                recurrente=factura.get("recurrente", False),
            )
            import asyncio
            result = asyncio.run(_crear_factura_interna(factura["user_id"], req))
            supabase.table("facturas_pendientes") \
                .update({"estado": "completado"}) \
                .eq("id", fid) \
                .execute()
            results["success"] += 1
            logger.info(f"Factura {fid} completada en reintento {intentos + 1}")
        except Exception as e:
            import math
            backoff_minutes = 5 * (2 ** intentos)
            backoff_minutes = min(backoff_minutes, 1440)
            next_retry = datetime.now(timezone.utc) + timedelta(minutes=backoff_minutes)
            supabase.table("facturas_pendientes").update({
                "intentos": intentos + 1,
                "ultimo_error": str(e)[:500],
                "proximo_reintento": next_retry.isoformat(),
            }).eq("id", fid).execute()
            results["failed"] += 1
            logger.warning(f"Factura {fid} reintento {intentos + 1} falló: {e}")

    return results


@router.get("/process")
def procesar_cola(secret: str = ""):
    import os
    if secret != os.getenv("CRON_SECRET", ""):
        raise HTTPException(403, "No autorizado")
    results = process_pending_retries()
    return {"ok": True, **results}


@router.get("/pending")
def listar_pendientes(authorization: str = ""):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    uid = res.user.id
    pendientes = supabase.table("facturas_pendientes") \
        .select("*, clientes(nombre, apellido)") \
        .eq("user_id", uid) \
        .eq("estado", "pendiente") \
        .order("created_at", desc=True) \
        .execute()
    return {"pendientes": pendientes.data}


@router.delete("/{factura_pendiente_id}")
def cancelar_pendiente(factura_pendiente_id: str, authorization: str = ""):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    uid = res.user.id
    supabase.table("facturas_pendientes") \
        .update({"estado": "cancelado"}) \
        .eq("id", factura_pendiente_id) \
        .eq("user_id", uid) \
        .execute()
    return {"ok": True}
