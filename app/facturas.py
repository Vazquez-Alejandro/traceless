from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
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
        "vencimiento": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
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
    supabase.table("facturas").update({"estado": "pagada", "fecha_pago": datetime.now().strftime("%Y-%m-%d")}).eq("id", factura_id).execute()
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

@router.get("/{factura_id}/pdf")
def factura_pdf(factura_id: str):
    f = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit, direccion, condicion_iva)").eq("id", factura_id).single().execute()
    if not f.data:
        raise HTTPException(404, "Factura no encontrada")
    perfil = supabase.table("perfiles").select("*").eq("id", f.data["user_id"]).single().execute()
    emisor = perfil.data or {"nombre": "Usuario", "cuit": "", "direccion": "", "condicion_iva": "Responsable Inscripto"}
    from app.pdf import generar_html_factura
    html = generar_html_factura(f.data, f.data.get("clientes") or {}, emisor)
    from fastapi.responses import HTMLResponse
    return HTMLResponse(html)

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

@router.get("/recordatorio-monotributo")
def recordatorio_monotributo(secret: str = ""):
    if secret != os.getenv("CRON_SECRET", ""):
        raise HTTPException(403, "No autorizado")
    from app.whatsapp import enviar_whatsapp
    import asyncio
    from app.db import supabase as _sb
    import httpx as _httpx
    hoy = datetime.now()
    dia = hoy.day
    if dia < 20:
        return {"ok": True, "mensaje": "Aun no es momento del recordatorio", "dia": dia}
    r = _httpx.get(
        f"{_URL}/auth/v1/admin/users",
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"},
        params={"per_page": 100},
    )
    users = r.json().get("users", [])
    enviados = 0
    for u in users:
        meta = u.get("app_metadata") or {}
        plan = meta.get("plan", "free")
        if plan == "free":
            continue
        perfil_r = _sb.table("perfiles").select("telefono, nombre").eq("id", u["id"]).execute()
        perfil = perfil_r.data[0] if perfil_r.data else {}
        tel = perfil.get("telefono", "")
        nombre = perfil.get("nombre", "")
        if not tel:
            continue
        cat = meta.get("monotributo_categoria", "")
        msg = f"Hola {nombre}! " if nombre else "Hola! "
        msg += "Recordá que pronto vence la cuota del monotributo."
        if cat:
            msg += f"\nTu categoria: {cat}"
        msg += "\n\nNo te olvides de pagarlo para mantener todo en regla."
        msg += "\n\n* Hecho con TraceLess -- traceless.com.ar"
        asyncio.create_task(enviar_whatsapp(tel, msg))
        enviados += 1
    return {"ok": True, "enviados": enviados}

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
                            "fecha": hoy,
                            "vencimiento": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                            "estado": "emitida",
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
    por_cobrar = emitidas + vencidas
    return {"totales": totales, "emitidas": emitidas, "vencidas": vencidas, "pagadas": pagadas, "anuladas": anuladas, "por_cobrar": por_cobrar}

@router.get("/resumen")
def resumen(authorization: str = Header("")):
    uid = get_user_id(authorization)
    now = datetime.now()
    anio = now.year
    mes_actual = now.month
    res = supabase.table("facturas").select("total, fecha, estado").eq("user_id", uid).execute()
    facturas = res.data
    mes_actual_total = 0
    mes_anterior_total = 0
    anio_total = 0
    for f in facturas:
        if f["estado"] == "anulada":
            continue
        total = f["total"]
        anio_total += total
        try:
            fecha = datetime.strptime(f["fecha"], "%Y-%m-%d")
            if fecha.year == anio:
                if fecha.month == mes_actual:
                    mes_actual_total += total
                elif fecha.month == mes_actual - 1 or (mes_actual == 1 and fecha.month == 12):
                    mes_anterior_total += total
        except (ValueError, TypeError):
            pass
    return {
        "mes_actual": round(mes_actual_total, 2),
        "mes_anterior": round(mes_anterior_total, 2),
        "anio": round(anio_total, 2),
        "mes_nombre": now.strftime("%B").capitalize(),
    }

@router.get("/analytics/clientes")
def analytics_clientes(authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("facturas").select("total, fecha, vencimiento, fecha_pago, estado, clientes(nombre, apellido)").eq("user_id", uid).execute()
    facturas = res.data
    clientes: dict[str, dict] = {}
    for f in facturas:
        cli = f.get("clientes") or {}
        cid = str(cli.get("nombre", "")) + " " + str(cli.get("apellido", ""))
        if not cid.strip():
            continue
        if cid not in clientes:
            clientes[cid] = {"cliente": cid.strip(), "total": 0, "pagadas_tiempo": 0, "pagadas_vencidas": 0, "impagas": 0, "dias_atraso": []}
        c = clientes[cid]
        c["total"] += 1
        if f["estado"] == "pagada":
            if f.get("fecha_pago") and f.get("vencimiento"):
                dias = (datetime.strptime(f["fecha_pago"], "%Y-%m-%d") - datetime.strptime(f["vencimiento"], "%Y-%m-%d")).days
                if dias <= 0:
                    c["pagadas_tiempo"] += 1
                else:
                    c["pagadas_vencidas"] += 1
                    c["dias_atraso"].append(dias)
            else:
                c["pagadas_tiempo"] += 1
        elif f["estado"] in ("emitida", "vencida"):
            c["impagas"] += 1
    result = []
    for c in clientes.values():
        atraso_prom = round(sum(c["dias_atraso"]) / len(c["dias_atraso"])) if c["dias_atraso"] else 0
        result.append({
            "cliente": c["cliente"],
            "total": c["total"],
            "pagadas_tiempo": c["pagadas_tiempo"],
            "pagadas_vencidas": c["pagadas_vencidas"],
            "impagas": c["impagas"],
            "atraso_promedio": atraso_prom,
        })
    result.sort(key=lambda x: x["atraso_promedio"], reverse=True)
    return {"clientes": result}

@router.get("/clientes/{cliente_id}")
def historial_cliente(cliente_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    cli = supabase.table("clientes").select("*").eq("id", cliente_id).eq("user_id", uid).single().execute()
    if not cli.data:
        raise HTTPException(404, "Cliente no encontrado")
    res = supabase.table("facturas").select("*").eq("cliente_id", cliente_id).eq("user_id", uid).order("created_at", desc=True).execute()
    facturas = res.data
    total = len(facturas)
    pagadas_tiempo = 0
    pagadas_vencidas = 0
    impagas = 0
    dias_atraso = []
    total_facturado = 0
    for f in facturas:
        total_facturado += f["total"]
        if f["estado"] == "pagada":
            if f.get("fecha_pago") and f.get("vencimiento"):
                dias = (datetime.strptime(f["fecha_pago"], "%Y-%m-%d") - datetime.strptime(f["vencimiento"], "%Y-%m-%d")).days
                if dias <= 0:
                    pagadas_tiempo += 1
                else:
                    pagadas_vencidas += 1
                    dias_atraso.append(dias)
            else:
                pagadas_tiempo += 1
        elif f["estado"] in ("emitida", "vencida"):
            impagas += 1
    atraso_prom = round(sum(dias_atraso) / len(dias_atraso)) if dias_atraso else 0
    resumen = {
        "total": total,
        "total_facturado": total_facturado,
        "pagadas_tiempo": pagadas_tiempo,
        "pagadas_vencidas": pagadas_vencidas,
        "impagas": impagas,
        "atraso_promedio": atraso_prom,
    }
    return {"cliente": cli.data, "facturas": facturas, "resumen": resumen}

@router.get("/{factura_id}")
def obtener_factura(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit, telefono, direccion, condicion_iva)").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not res.data:
        raise HTTPException(404, "Factura no encontrada")
    return {"factura": res.data}

def _tipo_nombre(tipo: int) -> str:
    return {1: "A", 6: "B", 11: "C", 19: "E"}.get(tipo, "B")
