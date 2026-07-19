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

class DetalleItem(BaseModel):
    descripcion: str
    cantidad: float = 1
    precio_unitario: float

class FacturaCreate(BaseModel):
    cliente_id: str
    tipo: int = 6
    importe: Optional[float] = None
    descripcion: str = "Honorarios"
    detalles: list[DetalleItem] = []

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

    if req.detalles:
        subtotal = sum(d.cantidad * d.precio_unitario for d in req.detalles)
        importe_total = round(subtotal, 2)
    else:
        importe_total = req.importe or 0

    last = supabase.table("facturas").select("numero").eq("user_id", uid).order("created_at", desc=True).limit(1).execute()
    ultimo_numero = 0
    if last.data:
        try:
            ultimo_numero = int(last.data[0]["numero"].split("-")[-1])
        except (ValueError, IndexError):
            ultimo_numero = 0

    afip_result = generar_factura_afip(
        cliente_cuit=cliente.data.get("cuit", ""),
        cliente_nombre=f"{cliente.data['nombre']} {cliente.data.get('apellido', '')}",
        tipo=req.tipo,
        importe=importe_total,
        condicion_iva=cliente.data.get("condicion_iva", "Consumidor Final"),
        descripcion=req.descripcion,
        ultimo_numero=ultimo_numero,
    )

    detalles_json = [d.model_dump() for d in req.detalles] if req.detalles else []

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
        "detalles": detalles_json,
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

@router.put("/{factura_id}/anular")
def anular_factura(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    factura = supabase.table("facturas").select("*").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")
    if factura.data["estado"] == "anulada":
        raise HTTPException(400, "La factura ya está anulada")
    supabase.table("facturas").update({"estado": "anulada"}).eq("id", factura_id).execute()
    return {"ok": True, "mensaje": "Factura anulada correctamente. Recordá emitir la nota de crédito correspondiente ante ARCA."}

@router.put("/{factura_id}/pagar")
def pagar_factura(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    factura = supabase.table("facturas").select("*").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")
    if factura.data["estado"] != "emitida":
        raise HTTPException(400, "Solo se pueden pagar facturas en estado emitida")
    supabase.table("facturas").update({"estado": "pagada"}).eq("id", factura_id).execute()
    return {"ok": True, "mensaje": "Factura marcada como pagada"}

@router.get("/export")
def exportar_facturas(authorization: str = Header(""), desde: str = "", hasta: str = "", token: str = ""):
    auth = authorization or f"Bearer {token}"
    uid = get_user_id(auth)
    q = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit)").eq("user_id", uid)
    if desde:
        q = q.gte("fecha", desde)
    if hasta:
        q = q.lte("fecha", hasta)
    res = q.order("created_at", desc=True).execute()
    facturas = res.data

    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Facturas"
    ws.append(["Número", "Fecha", "Cliente", "CUIT", "Tipo", "Neto", "IVA", "Total", "CAE", "Estado"])
    for f in facturas:
        cli = f.get("clientes") or {}
        ws.append([
            f["numero"], f["fecha"], f"{cli.get('nombre','')} {cli.get('apellido','')}",
            cli.get("cuit", ""), f.get("tipo", ""), f.get("neto", 0),
            f.get("iva", 0), f["total"], f.get("cae", ""), f.get("estado", ""),
        ])
    import tempfile
    path = tempfile.mktemp(suffix=".xlsx")
    wb.save(path)
    from fastapi.responses import FileResponse
    return FileResponse(path, filename=f"facturas-{datetime.now().strftime('%Y%m%d')}.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@router.get("/public/{factura_id}")
def factura_publica(factura_id: str):
    res = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit, direccion, condicion_iva)").eq("id", factura_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Factura no encontrada")
    return {"factura": res.data}

@router.get("/recordatorios")
def enviar_recordatorios(secret: str = ""):
    if secret != os.getenv("CRON_SECRET", ""):
        raise HTTPException(403, "No autorizado")
    from app.whatsapp import enviar_factura_whatsapp
    import asyncio
    vencidas = supabase.table("facturas").select("*, clientes!inner(telefono, nombre, apellido)").eq("estado", "emitida").lte("fecha", (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")).execute()
    enviados = 0
    for f in vencidas.data:
        cli = f.get("clientes") or {}
        telefono = cli.get("telefono", "")
        if not telefono:
            continue
        total = f.get("total", 0)
        num = f.get("numero", "")
        pdf = f.get("pdf_url", "")
        base = os.getenv("BASE_URL", "https://www.traceless.com.ar")
        asyncio.create_task(enviar_factura_whatsapp(telefono, cli.get("nombre",""), num, total, f"{base}{pdf}"))
        supabase.table("facturas").update({"estado": "vencida"}).eq("id", f["id"]).execute()
        enviados += 1
    return {"ok": True, "recordatorios_enviados": enviados}

@router.get("/estadisticas")
def estadisticas(authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("facturas").select("total, fecha, estado").eq("user_id", uid).execute()
    facturas = res.data
    totales = sum(f["total"] for f in facturas if f["estado"] != "anulada")
    emitidas = sum(1 for f in facturas if f["estado"] == "emitida")
    vencidas = sum(1 for f in facturas if f["estado"] == "vencida")
    pagadas = sum(1 for f in facturas if f["estado"] == "pagada")
    anuladas = sum(1 for f in facturas if f["estado"] == "anulada")
    return {"totales": totales, "emitidas": emitidas, "vencidas": vencidas, "pagadas": pagadas, "anuladas": anuladas}

@router.get("/{factura_id}")
def obtener_factura(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit, telefono, direccion, condicion_iva)").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not res.data:
        raise HTTPException(404, "Factura no encontrada")
    return {"factura": res.data}

def _tipo_nombre(tipo: int) -> str:
    return {1: "A", 6: "B", 11: "C", 19: "E"}.get(tipo, "B")
