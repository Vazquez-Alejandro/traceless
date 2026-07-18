from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db import supabase
from app.afip import generar_factura_afip
from app.pdf import generar_pdf_factura, guardar_factura_html
from app.whatsapp import enviar_factura_whatsapp
from app.lemon import can_create_invoice, get_user_plan
import os

router = APIRouter(prefix="/api/facturas", tags=["facturas"])

def get_user_id(authorization: str = ""):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    return res.user.id

class FacturaCreate(BaseModel):
    cliente_id: str
    tipo: int = 6  # Factura B default
    importe: float
    descripcion: str = "Honorarios"

@router.post("")
async def crear_factura(req: FacturaCreate, authorization: str = Header("")):
    uid = get_user_id(authorization)

    ok, msg = can_create_invoice(uid)
    if not ok:
        raise HTTPException(402, msg)

    plan = get_user_plan(uid)
    cliente = supabase.table("clientes").select("*").eq("id", req.cliente_id).eq("user_id", uid).single().execute()
    if not cliente.data:
        raise HTTPException(404, "Cliente no encontrado")

    perfil = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
    emisor = perfil.data or {"nombre": "Usuario", "cuit": "", "condicion_iva": "Responsable Inscripto"}

    afip_result = generar_factura_afip(
        cliente_cuit=cliente.data.get("cuit", ""),
        cliente_nombre=f"{cliente.data['nombre']} {cliente.data.get('apellido', '')}",
        tipo=req.tipo,
        importe=req.importe,
        condicion_iva=cliente.data.get("condicion_iva", "Consumidor Final"),
        descripcion=req.descripcion,
    )

    factura_data = {
        "user_id": uid,
        "cliente_id": req.cliente_id,
        "tipo": req.tipo,
        "numero": afip_result["numero"],
        "cae": afip_result["cae"],
        "cae_vencimiento": afip_result["cae_vencimiento"],
        "neto": afip_result["neto"],
        "iva": afip_result["iva"],
        "total": afip_result["total"],
        "descripcion": req.descripcion,
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "estado": "emitida",
    }

    res = supabase.table("facturas").insert(factura_data).execute()
    factura = res.data[0]

    pdf_bytes = generar_pdf_factura(
        factura={**factura_data, "tipo_nombre": _tipo_nombre(req.tipo)},
        cliente=cliente.data,
        emisor=emisor,
    )
    html_url = guardar_factura_html(
        factura={**factura_data, "id": factura["id"], "tipo_nombre": _tipo_nombre(req.tipo)},
        cliente=cliente.data,
        emisor=emisor,
    )

    supabase.table("facturas").update({"pdf_url": html_url}).eq("id", factura["id"]).execute()

    if plan["whatsapp"]:
        telefono = cliente.data.get("telefono", "")
        if telefono:
            pdf_url = f"{os.getenv('BASE_URL', 'http://localhost:8002')}{html_url}"
            await enviar_factura_whatsapp(
                telefono=telefono,
                cliente=cliente.data["nombre"],
                numero=factura["numero"],
                total=factura["total"],
                pdf_url=pdf_url,
            )

    return {"factura": {**factura, "pdf_url": html_url}}

@router.get("")
def listar_facturas(authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit)").eq("user_id", uid).order("created_at", desc=True).execute()
    return {"facturas": res.data}

@router.get("/{factura_id}")
def obtener_factura(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit, telefono, direccion, condicion_iva)").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not res.data:
        raise HTTPException(404, "Factura no encontrada")
    return {"factura": res.data}

def _tipo_nombre(tipo: int) -> str:
    return {1: "A", 6: "B", 11: "C", 19: "E"}.get(tipo, "B")
