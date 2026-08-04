from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db import supabase, get_user_id
import logging

logger = logging.getLogger("reembolsos")

router = APIRouter(prefix="/api/reembolsos", tags=["reembolsos"])

METODOS_REEMBOLSO = [
    "transferencia",
    "mercadopago",
    "efectivo",
    "cheque",
    "otro",
]

class ReembolsoCreate(BaseModel):
    factura_id: str
    nota_credito_id: Optional[str] = None
    monto: float
    metodo: str = "transferencia"
    referencia: str = ""
    fecha: Optional[str] = None
    notas: str = ""


@router.post("")
def crear_reembolso(req: ReembolsoCreate, authorization: str = Header("")):
    uid = get_user_id(authorization)

    if req.monto <= 0:
        raise HTTPException(400, "El monto debe ser mayor a 0")
    if req.metodo not in METODOS_REEMBOLSO:
        raise HTTPException(400, f"Método inválido. Opciones: {', '.join(METODOS_REEMBOLSO)}")

    factura = supabase.table("facturas").select("*").eq("id", req.factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")

    fact = factura.data
    if fact["estado"] not in ("emitida", "enviada", "vencida", "anulada"):
        raise HTTPException(400, "No se puede registrar reembolso para esta factura")

    # Check total refunded doesn't exceed invoice total
    existing = supabase.table("reembolsos").select("monto").eq("factura_id", req.factura_id).eq("user_id", uid).execute()
    total_reembolsado = sum(float(r["monto"]) for r in (existing.data or []))
    disponible = float(fact["total"]) - total_reembolsado

    if req.monto > disponible + 0.01:
        raise HTTPException(400, f"El monto (${req.monto:,.2f}) supera el saldo disponible (${disponible:,.2f})")

    reembolso_data = {
        "user_id": uid,
        "factura_id": req.factura_id,
        "nota_credito_id": req.nota_credito_id,
        "monto": round(req.monto, 2),
        "metodo": req.metodo,
        "referencia": req.referencia,
        "fecha": req.fecha or datetime.now().strftime("%Y-%m-%d"),
        "estado": "completado",
        "notas": req.notas,
    }

    res = supabase.table("reembolsos").insert(reembolso_data).execute()
    return {"ok": True, "reembolso": res.data[0], "mensaje": "Reembolso registrado"}


@router.get("")
def listar_reembolsos(authorization: str = Header(""), factura_id: Optional[str] = None):
    uid = get_user_id(authorization)
    q = supabase.table("reembolsos").select("*, facturas!inner(numero, total, estado, clientes(nombre, apellido))").eq("user_id", uid)
    if factura_id:
        q = q.eq("factura_id", factura_id)
    res = q.order("created_at", desc=True).execute()

    reembolsos = []
    for r in (res.data or []):
        fact = r.get("facturas") or {}
        cli = fact.get("clientes") or {}
        reembolsos.append({
            **r,
            "factura_numero": fact.get("numero", ""),
            "factura_total": fact.get("total", 0),
            "cliente_nombre": f"{cli.get('nombre', '')} {cli.get('apellido', '')}".strip(),
        })

    return {"reembolsos": reembolsos}


@router.delete("/{reembolso_id}")
def eliminar_reembolso(reembolso_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    reembolso = supabase.table("reembolsos").select("*").eq("id", reembolso_id).eq("user_id", uid).single().execute()
    if not reembolso.data:
        raise HTTPException(404, "Reembolso no encontrado")
    supabase.table("reembolsos").delete().eq("id", reembolso_id).execute()
    return {"ok": True, "mensaje": "Reembolso eliminado"}


@router.get("/resumen/{factura_id}")
def resumen_reembolsos(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    factura = supabase.table("facturas").select("*").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")

    existing = supabase.table("reembolsos").select("monto, metodo, fecha, estado").eq("factura_id", factura_id).eq("user_id", uid).execute()
    total_reembolsado = sum(float(r["monto"]) for r in (existing.data or []))
    total_factura = float(factura.data["total"])

    return {
        "factura_id": factura_id,
        "total_factura": total_factura,
        "total_reembolsado": round(total_reembolsado, 2),
        "saldo_pendiente": round(total_factura - total_reembolsado, 2),
        "reembolsos": existing.data or [],
    }
