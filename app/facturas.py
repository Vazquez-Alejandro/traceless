from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db import supabase, _URL, _SERVICE_KEY
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
    recurrente: bool = False

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

    import json as _json

    if req.detalles:
        subtotal = sum(d.cantidad * d.precio_unitario for d in req.detalles)
        importe_total = round(subtotal, 2)
        descripcion_final = _json.dumps({"d": req.descripcion, "i": [{"desc": it.descripcion, "cant": it.cantidad, "precio": it.precio_unitario} for it in req.detalles], "r": req.recurrente}, ensure_ascii=False)
    else:
        importe_total = req.importe or 0
        if req.recurrente:
            descripcion_final = _json.dumps({"d": req.descripcion, "i": [], "r": True}, ensure_ascii=False)
        else:
            descripcion_final = req.descripcion

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
        "descripcion": descripcion_final,
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "estado": "emitida",
    }

    if req.recurrente:
        try:
            import httpx
            r = httpx.get(f"{_URL}/auth/v1/admin/users/{uid}",
                headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"})
            if r.status_code == 200:
                meta = r.json().get("app_metadata", {})
                recs = meta.get("recurrentes", [])
                prox = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                recs.append({
                    "cliente_id": req.cliente_id,
                    "tipo": req.tipo,
                    "importe": importe_total,
                    "descripcion": descripcion_final,
                    "proxima": prox,
                    "activo": True,
                })
                meta["recurrentes"] = recs
                httpx.put(f"{_URL}/auth/v1/admin/users/{uid}",
                    headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
                    json={"app_metadata": meta})
        except Exception:
            pass

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
                fecha=factura["fecha"].split("T")[0],
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
    from app.whatsapp import enviar_whatsapp
    import asyncio
    now = datetime.now()
    # Recordatorios semanales: facturas emitidas hace 7+ días
    vencidas = supabase.table("facturas").select("*, clientes!inner(telefono, nombre, apellido)").eq("estado", "emitida").lte("fecha", (now - timedelta(days=7)).strftime("%Y-%m-%d")).execute()
    enviados = 0
    for f in vencidas.data:
        cli = f.get("clientes") or {}
        telefono = cli.get("telefono", "")
        if not telefono:
            continue
        total = f.get("total", 0)
        num = f.get("numero", "")
        dias = (now - datetime.strptime(f["fecha"], "%Y-%m-%d")).days
        if dias >= 30:
            msg = f"⚠️ *{cli.get('nombre','')}*, la factura *{num}* por ${total:,.2f} tiene más de 30 días impaga. Te notificamos que se sumará a la próxima factura si no se cancela antes."
            supabase.table("facturas").update({"estado": "vencida"}).eq("id", f["id"]).execute()
        else:
            msg = f"📋 *Recordatorio:* La factura *{num}* por ${total:,.2f} a nombre de {cli.get('nombre','')} está pendiente de pago ({dias} días)."
        pdf = f.get("pdf_url", "")
        if pdf:
            base_url = os.getenv("BASE_URL", "https://www.traceless.com.ar")
            msg += f"\nPodés verla acá: {base_url}{pdf}"
        asyncio.create_task(enviar_whatsapp(telefono, msg))
        enviados += 1
    return {"ok": True, "recordatorios_enviados": enviados}

@router.get("/recurrentes")
def procesar_recurrentes(secret: str = ""):
    if secret != os.getenv("CRON_SECRET", ""):
        raise HTTPException(403, "No autorizado")
    hoy = datetime.now().strftime("%Y-%m-%d")
    emitidas = 0
    import httpx as _httpx
    import asyncio
    limit = 50
    offset = 0
    while True:
        r = _httpx.get(f"{_URL}/auth/v1/admin/users?per_page={limit}&page={offset//limit +1}",
            headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"})
        if r.status_code != 200:
            break
        users = r.json().get("users", [])
        if not users:
            break
        for u in users:
            meta = u.get("app_metadata", {})
            recs = meta.get("recurrentes", [])
            changed = False
            for rec in recs:
                if not rec.get("activo"):
                    continue
                if rec.get("proxima", "") <= hoy:
                    try:
                        uid = u["id"]
                        cli = supabase.table("clientes").select("*").eq("id", rec["cliente_id"]).eq("user_id", uid).single().execute()
                        if not cli.data:
                            continue
                        perf = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
                        emisor = perf.data or {}
                        from app.afip import _mock_generate
                        res = _mock_generate(cli.data.get("cuit",""), rec["tipo"], rec["importe"], rec.get("descripcion",""), 0)
                        fd = {
                            "user_id": uid, "cliente_id": rec["cliente_id"],
                            "tipo": rec["tipo"], "numero": res["numero"],
                            "cae": res["cae"], "cae_vencimiento": res["cae_vencimiento"],
                            "neto": res["neto"], "iva": res["iva"],
                            "total": res["total"],
                            "descripcion": rec.get("descripcion",""),
                            "fecha": hoy, "estado": "emitida",
                        }
                        supabase.table("facturas").insert(fd).execute()
                        from datetime import timedelta
                        rec["proxima"] = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                        changed = True
                        emitidas += 1
                    except Exception:
                        pass
            if changed:
                meta["recurrentes"] = recs
                _httpx.put(f"{_URL}/auth/v1/admin/users/{u['id']}",
                    headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
                    json={"app_metadata": meta})
        offset += limit
    return {"ok": True, "emitidas": emitidas}

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
