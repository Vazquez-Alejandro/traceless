from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.db import supabase, _URL, _SERVICE_KEY, get_user_id
from app.afip import generar_factura_afip
from app.pdf import generar_pdf_factura, guardar_factura_html
from app.whatsapp import enviar_factura_whatsapp
from app.lemon import can_create_invoice, get_user_plan, can_send_whatsapp, log_whatsapp_send, has_feature
from app.retry_queue import queue_factura
from app.notifications import crear_notificacion
import os, logging, threading

def _validar_cron(secret: str = "", authorization: str = ""):
    """Valida invocaciones de cron de Vercel: acepta el header Authorization
    (Bearer CRON_SECRET, que Vercel envía automáticamente) o el query param
    ?secret= (usado históricamente)."""
    esperado = os.getenv("CRON_SECRET", "")
    if not esperado:
        raise HTTPException(403, "Cron deshabilitado")
    if authorization.replace("Bearer ", "").strip() == esperado:
        return
    if secret and secret == esperado:
        return
    raise HTTPException(403, "No autorizado")

logger = logging.getLogger("facturas")

router = APIRouter(prefix="/api/facturas", tags=["facturas"])

# Lock per user for invoice number generation (prevents race conditions)
_user_locks: dict[str, threading.Lock] = {}
_user_locks_lock = threading.Lock()

def _get_user_lock(user_id: str) -> threading.Lock:
    with _user_locks_lock:
        if user_id not in _user_locks:
            _user_locks[user_id] = threading.Lock()
        return _user_locks[user_id]

def _extract_numero(texto: str) -> int:
    """Extrae la parte numérica final de '0001-00000012' (falla segura a 0)."""
    try:
        return int(texto.split("-")[-1])
    except (ValueError, IndexError):
        return 0

def _ultimo_numero_usuario(uid: str) -> int:
    """Último número de factura emitida (excluye programadas sin número real)."""
    try:
        last = supabase.table("facturas").select("numero").eq("user_id", uid).neq("numero", "").neq("estado", "programada").order("created_at", desc=True).limit(1).execute()
        if last.data and last.data[0].get("numero"):
            return _extract_numero(last.data[0]["numero"])
    except Exception:
        pass
    return 0

def _fiscal_cfg_emisor(emisor: dict, modo: str = "fiscal") -> dict:
    from app.crypto import descifrar_secreto
    tiene_cert = bool(emisor.get("arca_cert") and emisor.get("arca_key"))
    cfg = {
        "cuit": emisor.get("arca_cuit") or emisor.get("cuit") or "",
        "pto_venta": int(emisor["arca_punto_venta"]) if emisor.get("arca_punto_venta") else None,
        "homologacion": (emisor.get("arca_env", "produccion") != "produccion"),
        "use_real": tiene_cert and modo == "fiscal",
        "nombre": emisor.get("nombre", ""),
        "direccion": emisor.get("direccion", ""),
        "condicion_iva": emisor.get("condicion_iva", "Responsable Inscripto"),
        "cert": None,
        "key": None,
    }
    cert = descifrar_secreto(emisor.get("arca_cert") or "")
    key = descifrar_secreto(emisor.get("arca_key") or "")
    if cert:
        cfg["cert"] = cert
    if key:
        cfg["key"] = key
    return cfg

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
    scheduled_send: Optional[str] = None
    canal: str = "whatsapp"
    modo: str = "fiscal"

@router.post("")
async def crear_factura(req: FacturaCreate, authorization: str = Header("")):
    uid = get_user_id(authorization)

    ok, msg = can_create_invoice(uid)
    if not ok:
        raise HTTPException(402, msg)

    if req.recurrente and not has_feature(uid, "recurrentes"):
        raise HTTPException(403, "Facturas recurrentes disponibles en plan Profesional y Equipo")

    importe_total = sum(d.cantidad * d.precio_unitario for d in req.detalles) if req.detalles else (req.importe or 0)
    if importe_total <= 0:
        raise HTTPException(400, "El importe debe ser mayor a 0")

    try:
        result = await _crear_factura_interna(uid, req)
        return result
    except Exception as e:
        import traceback
        logger.error("Error creando factura: %s\n%s", e, traceback.format_exc())
        queue_factura(
            user_id=uid,
            cliente_id=req.cliente_id,
            tipo=req.tipo,
            importe=req.importe or 0,
            descripcion=req.descripcion,
            detalles=[d.model_dump() for d in req.detalles] if req.detalles else [],
            recurrente=req.recurrente,
            error=str(e),
        )
        return {
            "factura": None,
            "pendiente": True,
            "mensaje": f"ARCA no respondió ({type(e).__name__}: {str(e)[:100]}). Tu factura está en cola.",
        }


@router.post("/preview")
async def preview_factura(req: FacturaCreate, authorization: str = Header("")):
    uid = get_user_id(authorization)
    from app.pdf import generar_html_factura
    from app.afip import _faecal

    cliente = supabase.table("clientes").select("*").eq("id", req.cliente_id).eq("user_id", uid).single().execute()
    if not cliente.data:
        raise HTTPException(404, "Cliente no encontrado")
    perfil = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
    emisor = perfil.data or {"nombre": "Usuario", "cuit": "", "condicion_iva": "Responsable Inscripto"}

    if req.detalles:
        importe_total = round(sum(d.cantidad * d.precio_unitario for d in req.detalles), 2)
    else:
        importe_total = req.importe or 0

    if importe_total <= 0:
        raise HTTPException(400, "El importe debe ser mayor a 0")

    neto, iva = _faecal(importe_total, req.tipo)
    preview_factura_dict = {
        "id": "preview",
        "numero": "PREVIEW",
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "tipo": req.tipo,
        "tipo_nombre": _tipo_nombre(req.tipo),
        "neto": neto,
        "iva": iva,
        "total": importe_total,
        "descripcion": req.descripcion,
        "detalles": [d.model_dump() for d in req.detalles] if req.detalles else [],
        "cae": "",
        "cae_vencimiento": "",
    }
    html = generar_html_factura(preview_factura_dict, cliente.data, emisor, preview=True)
    return {"html": html}


async def _crear_factura_interna(uid: str, req: FacturaCreate) -> dict:
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

    # Si es programada para futuro, guardamos sin emitir en ARCA
    hoy = datetime.now().strftime("%Y-%m-%d")
    es_programada = bool(req.scheduled_send and req.scheduled_send > hoy)

    if es_programada:
        factura_data = {
            "user_id": uid,
            "cliente_id": req.cliente_id,
            "tipo": req.tipo,
            "numero": "",
            "cae": "",
            "cae_vencimiento": "",
            "neto": 0,
            "iva": 0,
            "total": importe_total,
            "descripcion": descripcion_final,
            "fecha": req.scheduled_send,
            "vencimiento": "",
            "estado": "programada",
            "scheduled_send": req.scheduled_send,
        }
        res = supabase.table("facturas").insert(factura_data).execute()
        return {"factura": {**res.data[0]}}

    # Use per-user lock to prevent duplicate invoice numbers
    user_lock = _get_user_lock(uid)
    with user_lock:
        ultimo_numero = _ultimo_numero_usuario(uid)

    afip_result = generar_factura_afip(
        cliente_cuit=cliente.data.get("cuit", ""),
        cliente_nombre=f"{cliente.data['nombre']} {cliente.data.get('apellido', '')}",
        tipo=req.tipo,
        importe=importe_total,
        condicion_iva=cliente.data.get("condicion_iva", "Consumidor Final"),
        descripcion=req.descripcion,
        ultimo_numero=ultimo_numero,
        fiscal=_fiscal_cfg_emisor(emisor, req.modo),
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
        "fecha": hoy,
        "vencimiento": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "estado": "emitida",
        "es_fiscal": bool(afip_result.get("es_fiscal", True)),
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

    # Generar link de pago MP
    mp_link = ""
    from app.mercadopago import crear_link_pago_factura
    try:
        email_cliente = cliente.data.get("email", "")
        mp_link = crear_link_pago_factura(
            monto=importe_total,
            descripcion=req.descripcion,
            factura_id=factura["id"],
            email_cliente=email_cliente,
        )
    except Exception:
        pass

    html_url = guardar_factura_html(
        factura={**factura_data, "id": factura["id"], "tipo_nombre": _tipo_nombre(req.tipo)},
        cliente=cliente.data,
        emisor=emisor,
    )

    supabase.table("facturas").update({"pdf_url": html_url, "mp_link": mp_link}).eq("id", factura["id"]).execute()

    return {"factura": {**factura, "pdf_url": html_url, "mp_link": mp_link}, "enviado_por": "", "fallback_wa_me": False}

@router.get("")
def listar_facturas(authorization: str = Header(""), limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), cliente_id: Optional[str] = None, estado: Optional[str] = None):
    uid = get_user_id(authorization)
    q = supabase.table("facturas").select("*, clientes!inner(id, nombre, apellido, telefono)", count="exact").eq("user_id", uid)
    if cliente_id:
        q = q.eq("cliente_id", cliente_id)
    if estado:
        q = q.eq("estado", estado)
    total = q.execute().count
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"facturas": res.data, "total": total}

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


class NotaCreditoCreate(BaseModel):
    factura_original_id: str
    motivo: str = "Anulación total"
    importe: Optional[float] = None  # None = monto total de la original


_NC_TIPO_MAP = {1: 3, 6: 8, 11: 13, 19: 21}


def _nc_tipo_nombre(tipo: int) -> str:
    return {3: "NC A", 8: "NC B", 13: "NC C", 21: "NC E"}.get(tipo, "NC B")


@router.post("/nota-credito")
async def crear_nota_credito(req: NotaCreditoCreate, authorization: str = Header("")):
    uid = get_user_id(authorization)

    ok, msg = can_create_invoice(uid)
    if not ok:
        raise HTTPException(402, msg)

    _perfil = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
    _emisor = _perfil.data or {}

    factura_original = supabase.table("facturas").select("*").eq("id", req.factura_original_id).eq("user_id", uid).single().execute()
    if not factura_original.data:
        raise HTTPException(404, "Factura original no encontrada")

    orig = factura_original.data
    if orig["estado"] in ("programada", "anulada"):
        raise HTTPException(400, "No se puede emitir nota de crédito sobre una factura programada o anulada")

    tipo_original = orig.get("tipo", 6)
    tipo_nc = _NC_TIPO_MAP.get(tipo_original)
    if not tipo_nc:
        raise HTTPException(400, f"Tipo de factura {tipo_original} no tiene nota de crédito asociada")

    importe_nc = req.importe if req.importe is not None else float(orig["total"])
    if importe_nc <= 0:
        raise HTTPException(400, "El importe debe ser mayor a 0")
    if importe_nc > float(orig["total"]):
        raise HTTPException(400, f"El importe no puede superar el total de la factura original (${orig['total']:,.2f})")

    # If there are already credit notes against this invoice, check remaining amount
    existing_nc = supabase.table("facturas").select("total").eq("factura_original_id", req.factura_original_id).eq("user_id", uid).execute()
    total_nc_previo = sum(float(nc["total"]) for nc in (existing_nc.data or []))
    if total_nc_previo + importe_nc > float(orig["total"]):
        raise HTTPException(400, f"El importe total de notas de crédito (${total_nc_previo + importe_nc:,.2f}) supera el monto de la factura original (${orig['total']:,.2f})")

    cliente = supabase.table("clientes").select("*").eq("id", orig["cliente_id"]).eq("user_id", uid).single().execute()
    if not cliente.data:
        raise HTTPException(404, "Cliente no encontrado")

    # Use per-user lock for invoice number
    user_lock = _get_user_lock(uid)
    with user_lock:
        ultimo_numero = _ultimo_numero_usuario(uid)

    try:
        afip_result = generar_factura_afip(
            cliente_cuit=cliente.data.get("cuit", ""),
            cliente_nombre=f"{cliente.data['nombre']} {cliente.data.get('apellido', '')}",
            tipo=tipo_nc,
            importe=importe_nc,
            condicion_iva=cliente.data.get("condicion_iva", "Consumidor Final"),
            descripcion=f"Nota de crédito s/ Factura {orig.get('numero', '')} — {req.motivo}",
            ultimo_numero=ultimo_numero,
            fiscal=_fiscal_cfg_emisor(_emisor),
            factura_original_tipo=orig.get("tipo"),
            factura_original_numero=orig.get("numero", ""),
        )
    except Exception as e:
        raise HTTPException(502, f"Error emitiendo nota de crédito en ARCA: {e}")

    import json as _json
    nc_data = {
        "user_id": uid,
        "cliente_id": orig["cliente_id"],
        "tipo": tipo_nc,
        "numero": afip_result["numero"],
        "cae": afip_result["cae"],
        "cae_vencimiento": afip_result["cae_vencimiento"],
        "neto": afip_result["neto"],
        "iva": afip_result["iva"],
        "total": afip_result["total"],
        "descripcion": _json.dumps({
            "d": f"Nota de crédito s/ Factura {orig.get('numero', '')}",
            "motivo": req.motivo,
            "factura_original": orig.get("numero", ""),
        }, ensure_ascii=False),
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "estado": "emitida",
        "factura_original_id": req.factura_original_id,
    }

    res = supabase.table("facturas").insert(nc_data).execute()
    nc = res.data[0]

    perfil = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
    emisor = perfil.data or {"nombre": "Usuario", "cuit": "", "condicion_iva": "Responsable Inscripto"}

    html_url = guardar_factura_html(
        factura={**nc_data, "id": nc["id"], "tipo_nombre": _nc_tipo_nombre(tipo_nc)},
        cliente=cliente.data,
        emisor=emisor,
    )
    supabase.table("facturas").update({"pdf_url": html_url}).eq("id", nc["id"]).execute()

    # If full amount, mark original as "anulada"
    if importe_nc >= float(orig["total"]):
        supabase.table("facturas").update({"estado": "anulada"}).eq("id", req.factura_original_id).execute()

    return {
        "ok": True,
        "nota_credito": {**nc, "pdf_url": html_url},
        "mensaje": f"Nota de crédito {afip_result['numero']} emitida correctamente",
    }

@router.delete("/{factura_id}")
def eliminar_factura(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    factura = supabase.table("facturas").select("*").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")
    if factura.data["estado"] != "programada":
        raise HTTPException(400, "Solo se pueden eliminar facturas programadas. Para emitidas, usá Anular.")
    supabase.table("facturas").delete().eq("id", factura_id).execute()
    return {"ok": True, "mensaje": "Factura eliminada"}

class FacturaUpdate(BaseModel):
    cliente_id: Optional[str] = None
    tipo: Optional[int] = None
    importe: Optional[float] = None
    descripcion: Optional[str] = None
    scheduled_send: Optional[str] = None

@router.put("/{factura_id}")
def actualizar_factura(factura_id: str, req: FacturaUpdate, authorization: str = Header("")):
    uid = get_user_id(authorization)
    factura = supabase.table("facturas").select("*").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")
    if factura.data["estado"] not in ("programada", "emitida"):
        raise HTTPException(400, "Solo se pueden editar facturas programadas o emitidas")

    import json as _json
    update_data = {}
    if req.cliente_id is not None:
        update_data["cliente_id"] = req.cliente_id
    if req.tipo is not None:
        update_data["tipo"] = req.tipo
    if req.descripcion is not None:
        update_data["descripcion"] = req.descripcion
    if req.scheduled_send is not None:
        update_data["scheduled_send"] = req.scheduled_send if req.scheduled_send else None
    if req.importe is not None:
        update_data["total"] = req.importe
        # Update descripcion with items if present
        try:
            parsed = _json.loads(factura.data.get("descripcion", ""))
            if parsed.get("i"):
                parsed["d"] = req.descripcion or parsed.get("d", "")
                update_data["descripcion"] = _json.dumps(parsed, ensure_ascii=False)
        except Exception:
            pass

    if update_data:
        supabase.table("facturas").update(update_data).eq("id", factura_id).execute()
    return {"ok": True, "mensaje": "Factura actualizada"}

@router.put("/{factura_id}/pagar")
def pagar_factura(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    factura = supabase.table("facturas").select("*").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")
    if factura.data["estado"] not in ("emitida", "enviada", "vencida"):
        raise HTTPException(400, "Solo se pueden pagar facturas en estado emitida, enviada o vencida")
    supabase.table("facturas").update({"estado": "pagada", "fecha_pago": datetime.now().strftime("%Y-%m-%d")}).eq("id", factura_id).execute()
    return {"ok": True, "mensaje": "Factura marcada como pagada"}

@router.put("/{factura_id}/marcar-enviada")
def marcar_enviada(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    factura = supabase.table("facturas").select("*").eq("id", factura_id).eq("user_id", uid).single().execute()
    if not factura.data:
        raise HTTPException(404, "Factura no encontrada")
    if factura.data["estado"] != "emitida":
        raise HTTPException(400, "Solo se pueden marcar como enviadas facturas en estado emitida")
    supabase.table("facturas").update({"estado": "enviada"}).eq("id", factura_id).execute()
    return {"ok": True, "mensaje": "Factura marcada como enviada"}

class BulkWhatsApp(BaseModel):
    factura_ids: list[str]
    canal: str = "whatsapp"

@router.post("/enviar-whatsapp")
async def enviar_whatsapp_bulk(req: BulkWhatsApp, authorization: str = Header("")):
    uid = get_user_id(authorization)
    if not req.factura_ids:
        raise HTTPException(400, "Seleccioná al menos una factura")
    enviados = 0
    errores = []
    fallback_wa_me_ids = []
    enviados_email = []
    for fid in req.factura_ids[:20]:
        f = supabase.table("facturas").select("*, clientes(nombre, apellido, telefono, email)").eq("id", fid).eq("user_id", uid).single().execute()
        if not f.data or not f.data.get("clientes"):
            errores.append({"id": fid, "error": "Factura o cliente no encontrado"})
            continue
        pdf_url = f"{os.getenv('BASE_URL', 'https://www.traceless.com.ar')}/api/facturas/{fid}/public"
        mp_link = f.data.get("mp_link", "")
        estado_actual = f.data.get("estado", "")

        if req.canal in ("email", "both"):
            email_cliente = f.data["clientes"].get("email", "")
            if email_cliente:
                from app.email_sender import enviar_factura_email
                perfil = supabase.table("perfiles").select("nombre").eq("id", uid).single().execute()
                ok = enviar_factura_email(
                    email_cliente=email_cliente,
                    nombre_cliente=f.data["clientes"]["nombre"],
                    numero=f.data["numero"],
                    total=f.data["total"],
                    pdf_url=pdf_url,
                    mp_link=mp_link,
                    emisor_nombre=(perfil.data or {}).get("nombre", ""),
                )
                if ok:
                    enviados += 1
                    enviados_email.append(f.data["clientes"]["nombre"])
                else:
                    if req.canal == "email":
                        errores.append({"id": fid, "error": "Error al enviar email"})
            elif req.canal == "email":
                errores.append({"id": fid, "error": f"Cliente {f.data['clientes']['nombre']} sin email"})

        if req.canal in ("whatsapp", "both"):
            import re
            telefono = re.sub(r'[^0-9]', '', (f.data["clientes"].get("telefono") or ""))
            if not telefono:
                if req.canal == "whatsapp":
                    errores.append({"id": fid, "error": f"Cliente {f.data['clientes']['nombre']} sin teléfono"})
                continue
            from app.lemon import can_send_whatsapp, log_whatsapp_send, get_whatsapp_count, get_user_plan
            from app.creditos import descontar_credito
            wp_ok, wp_msg = can_send_whatsapp(uid)
            if not wp_ok:
                fallback_wa_me_ids.append(fid)
                continue
            await enviar_factura_whatsapp(
                telefono=telefono,
                cliente=f.data["clientes"]["nombre"],
                numero=f.data["numero"],
                total=f.data["total"],
                pdf_url=pdf_url,
                fecha=f.data.get("fecha", ""),
                mp_link=mp_link,
                vencimiento=f.data.get("vencimiento", ""),
            )
            log_whatsapp_send(uid, fid, "factura")
            plan = get_user_plan(uid)
            count = get_whatsapp_count(uid)
            limit = plan.get("whatsapp_monthly_limit", 0)
            if count > limit:
                costo = plan.get("whatsapp_extra_cost", 70)
                descontar_credito(uid, costo, f"Mensaje extra WhatsApp #{count}")
            enviados += 1

        if estado_actual == "emitida":
            supabase.table("facturas").update({"estado": "enviada"}).eq("id", fid).execute()
    if enviados > 0:
        from app.creditos import verificar_creditos_bajos
        verificar_creditos_bajos(uid)
    return {"ok": True, "enviados": enviados, "errores": errores, "fallback_wa_me_ids": fallback_wa_me_ids, "enviados_email": enviados_email}

@router.get("/export")
def exportar_facturas(authorization: str = Header(""), desde: str = "", hasta: str = ""):
    uid = get_user_id(authorization)
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


class FacturaImportItem(BaseModel):
    cliente_cuit: str
    cliente_nombre: Optional[str] = None
    tipo: int = 11
    importe: float
    descripcion: str = "Honorarios"
    fecha: Optional[str] = None


@router.post("/import")
async def importar_facturas(req: list[FacturaImportItem], authorization: str = Header("")):
    uid = get_user_id(authorization)
    ok, msg = can_create_invoice(uid)
    if not ok:
        raise HTTPException(402, msg)

    _emi = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
    _emisor_import = _emi.data or {}

    resultados = []
    for i, item in enumerate(req):
        try:
            cuit_limpio = item.cliente_cuit.replace("-", "").strip()
            if not cuit_limpio:
                resultados.append({"fila": i + 1, "ok": False, "error": "CUIT vacío"})
                continue

            cliente = supabase.table("clientes").select("*").eq("cuit", cuit_limpio).eq("user_id", uid).execute()
            if cliente.data:
                cliente_id = cliente.data[0]["id"]
                cliente_data = cliente.data[0]
            else:
                nombre = item.cliente_nombre or f"Cliente {cuit_limpio}"
                nuevo = supabase.table("clientes").insert({
                    "user_id": uid,
                    "nombre": nombre,
                    "apellido": "",
                    "cuit": cuit_limpio,
                    "condicion_iva": "Consumidor Final",
                }).execute()
                cliente_id = nuevo.data[0]["id"]
                cliente_data = nuevo.data[0]

            user_lock = _get_user_lock(uid)
            with user_lock:
                ultimo_numero = _ultimo_numero_usuario(uid)

            afip_result = generar_factura_afip(
                cliente_cuit=cuit_limpio,
                cliente_nombre=f"{cliente_data.get('nombre', '')} {cliente_data.get('apellido', '')}".strip(),
                tipo=item.tipo,
                importe=item.importe,
                condicion_iva=cliente_data.get("condicion_iva", "Consumidor Final"),
                descripcion=item.descripcion,
                ultimo_numero=ultimo_numero,
                fiscal=_fiscal_cfg_emisor(_emisor_import),
            )

            hoy = item.fecha or datetime.now().strftime("%Y-%m-%d")
            factura_data = {
                "user_id": uid,
                "cliente_id": cliente_id,
                "tipo": item.tipo,
                "numero": afip_result["numero"],
                "cae": afip_result["cae"],
                "cae_vencimiento": afip_result["cae_vencimiento"],
                "neto": afip_result["neto"],
                "iva": afip_result["iva"],
                "total": afip_result["total"],
                "descripcion": item.descripcion,
                "fecha": hoy,
                "vencimiento": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "estado": "emitida",
            }
            res = supabase.table("facturas").insert(factura_data).execute()

            resultados.append({
                "fila": i + 1,
                "ok": True,
                "factura_id": res.data[0]["id"],
                "numero": afip_result["numero"],
                "cae": afip_result["cae"],
                "total": afip_result["total"],
            })
        except Exception as e:
            resultados.append({"fila": i + 1, "ok": False, "error": str(e)})

    exitosos = sum(1 for r in resultados if r["ok"])
    fallidos = sum(1 for r in resultados if not r["ok"])
    return {"ok": True, "exitosos": exitosos, "fallidos": fallidos, "resultados": resultados}


@router.get("/{factura_id}/public")
def factura_publica(factura_id: str):
    try:
        f = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit, direccion, condicion_iva, telefono)").eq("id", factura_id).single().execute()
    except Exception:
        raise HTTPException(404, "Factura no encontrada")
    if not f.data:
        raise HTTPException(404, "Factura no encontrada")
    perfil = supabase.table("perfiles").select("*").eq("id", f.data["user_id"]).single().execute()
    emisor = perfil.data or {"nombre": "Usuario", "cuit": "", "direccion": "", "condicion_iva": "Responsable Inscripto"}
    from app.pdf import generar_html_factura
    html = generar_html_factura({**f.data, "tipo_nombre": _tipo_nombre(f.data.get("tipo", 6))}, f.data.get("clientes") or {}, emisor)
    from fastapi.responses import HTMLResponse
    return HTMLResponse(html)

@router.get("/{factura_id}/pdf")
def factura_pdf(factura_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    try:
        f = supabase.table("facturas").select("*, clientes(nombre, apellido, cuit, direccion, condicion_iva)").eq("id", factura_id).eq("user_id", uid).single().execute()
    except Exception:
        raise HTTPException(404, "Factura no encontrada")
    if not f.data:
        raise HTTPException(404, "Factura no encontrada")
    perfil = supabase.table("perfiles").select("*").eq("id", f.data["user_id"]).single().execute()
    emisor = perfil.data or {"nombre": "Usuario", "cuit": "", "direccion": "", "condicion_iva": "Responsable Inscripto"}
    from app.pdf import generar_html_factura
    html = generar_html_factura({**f.data, "tipo_nombre": _tipo_nombre(f.data.get("tipo", 6))}, f.data.get("clientes") or {}, emisor)
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        from fastapi.responses import Response
        return Response(content=pdf_bytes, media_type="application/pdf",
                       headers={"Content-Disposition": f"attachment; filename=factura-{f.data.get('numero', 'sin-numero')}.pdf"})
    except Exception as e:
        logger.error(f"Error generando PDF: {e}")
        from fastapi.responses import HTMLResponse
        return HTMLResponse(html)

@router.get("/recordatorios")
async def enviar_recordatorios(secret: str = "", authorization: str = Header("")):
    _validar_cron(secret, authorization)
    from app.whatsapp import enviar_recordatorio_whatsapp
    import asyncio
    now = datetime.now()
    hoy = now.strftime("%Y-%m-%d")

    # Recordatorio para facturas emitidas sin enviar (3+ días)
    emitidas = supabase.table("facturas").select("*, clientes!inner(telefono, nombre, apellido)").eq("estado", "emitida").execute()
    for f in emitidas.data:
        cli = f.get("clientes") or {}
        total = f.get("total", 0)
        num = f.get("numero", "")
        fecha = f.get("fecha", "")
        if fecha:
            dias_sin_enviar = (now - datetime.strptime(fecha, "%Y-%m-%d")).days
            if dias_sin_enviar >= 3:
                perfil = supabase.table("perfiles").select("recordatorios_whatsapp").eq("id", f["user_id"]).single().execute()
                prefs = perfil.data or {}
                if prefs.get("recordatorios_whatsapp", False):
                    crear_notificacion(f["user_id"], "factura_sin_enviar", f"Factura #{num} sin enviar hace {dias_sin_enviar} días", f"La factura de ${total:,.2f} a {cli.get('nombre', '')} fue emitida pero no enviada", "/facturas")

    # Recordatorios automáticos de cobranza para facturas enviadas
    enviadas = supabase.table("facturas").select("*, clientes!inner(telefono, nombre, apellido)").eq("estado", "enviada").execute()
    facturas_pendientes = enviadas.data
    enviados = 0
    tasks = []
    for f in facturas_pendientes:
        cli = f.get("clientes") or {}
        telefono = cli.get("telefono", "")
        if not telefono:
            continue
        perfil = supabase.table("perfiles").select("recordatorios_whatsapp, recordatorio_vencidas").eq("id", f["user_id"]).single().execute()
        prefs = perfil.data or {}
        if not prefs.get("recordatorios_whatsapp", False):
            continue
        if not prefs.get("recordatorio_vencidas", False):
            continue
        total = f.get("total", 0)
        num = f.get("numero", "")
        vencimiento = f.get("vencimiento", "")
        fecha = f.get("fecha", "")
        enviado_str = f.get("recordatorios_enviados", "") or ""
        enviados_set = set(enviado_str.split(",")) if enviado_str else set()

        if vencimiento:
            dias_vencida = (now - datetime.strptime(vencimiento, "%Y-%m-%d")).days
        elif fecha:
            dias_vencida = (now - datetime.strptime(fecha, "%Y-%m-%d")).days - 30
        else:
            continue

        # Determinar qué recordatorio toca hoy
        recordatorio_tipo = None
        if dias_vencida == -1:
            recordatorio_tipo = "pre_1"
        elif dias_vencida == 0:
            recordatorio_tipo = "dia_0"
        elif dias_vencida == 3:
            recordatorio_tipo = "dia_3"
        elif dias_vencida == 7:
            recordatorio_tipo = "dia_7"
        elif dias_vencida == 15:
            recordatorio_tipo = "dia_15"

        # Si ya venció, marcar como vencida
        if dias_vencida > 0 and f["estado"] != "vencida":
            supabase.table("facturas").update({"estado": "vencida"}).eq("id", f["id"]).execute()
            crear_notificacion(f["user_id"], "factura_vencida", f"Factura #{num} vencida hace {dias_vencida} días", f"La factura de ${total:,.2f} a {cli.get('nombre', '')} lleva {dias_vencida} días sin pagar", "/facturas")

        # Enviar recordatorio si toca y no se envió antes
        if recordatorio_tipo and recordatorio_tipo not in enviados_set:
            tasks.append(enviar_recordatorio_whatsapp(telefono, cli.get("nombre", ""), num, total, dias_vencida))
            enviados_set.add(recordatorio_tipo)
            supabase.table("facturas").update({"recordatorios_enviados": ",".join(sorted(enviados_set))}).eq("id", f["id"]).execute()
            enviados += 1

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    return {"ok": True, "recordatorios_enviados": enviados}

@router.get("/recordatorio-monotributo")
async def recordatorio_monotributo(secret: str = "", authorization: str = Header("")):
    _validar_cron(secret, authorization)
    from app.whatsapp import enviar_recordatorio_monotributo_whatsapp
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
    tasks = []
    for u in users:
        meta = u.get("app_metadata") or {}
        plan = meta.get("plan", "free")
        if plan == "free":
            continue
        perfil_r = _sb.table("perfiles").select("telefono, nombre, recordatorio_monotributo").eq("id", u["id"]).execute()
        perfil = perfil_r.data[0] if perfil_r.data else {}
        if not perfil.get("recordatorio_monotributo", False):
            continue
        tel = perfil.get("telefono", "")
        nombre = perfil.get("nombre", "")
        if not tel:
            continue
        tasks.append(enviar_recordatorio_monotributo_whatsapp(tel, nombre or "Usuario"))
        crear_notificacion(u["id"], "recordatorio", "Recordatorio de monotributo", "Hoy es día 20, acordate de pagar el monotributo", "")
        enviados += 1
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    return {"ok": True, "enviados": enviados}

@router.get("/verificar-certificados")
async def verificar_certificados(secret: str = "", authorization: str = Header("")):
    """Cron diario: notifica a usuarios cuyo certificado ARCA esté por vencer (30 días)
    o ya vencido, para que lo renueven a tiempo y no interrumpan la emisión."""
    _validar_cron(secret, authorization)
    from app.afip import cert_expiracion
    import base64
    ahora = datetime.now(timezone.utc).date()
    avisados = {"vencidos": 0, "proximos": 0}

    res = supabase.table("perfiles").select("id, arca_cert, arca_validado").limit(1000).execute()
    for p in res.data or []:
        if not p.get("arca_validado"):
            continue
        cert = p.get("arca_cert") or ""
        try:
            from app.crypto import descifrar_secreto
            cert = descifrar_secreto(cert)
        except Exception:
            continue
        exp = cert_expiracion(cert)
        if not exp:
            continue
        restantes = (exp - ahora).days
        uid = p["id"]
        if restantes < 0:
            crear_notificacion(uid, "arca_cert_vencido", "Tu certificado de ARCA venció",
                               f"Tu certificado digital expiró el {exp.strftime('%d/%m/%Y')}. Renová el certificado en AFIP y actualizalo en Perfil → Facturación fiscal para seguir emitiendo facturas con CAE.", "/perfil")
            avisados["vencidos"] += 1
        elif restantes <= 30:
            crear_notificacion(uid, "arca_cert_proximo", "Tu certificado de ARCA vence pronto",
                               f"Tu certificado digital vence el {exp.strftime('%d/%m/%Y')} ({restantes} días). Renovalo en AFIP para no interrumpir la emisión de facturas.", "/perfil")
            avisados["proximos"] += 1
    return {"ok": True, **avisados}

@router.get("/recurrentes")
async def procesar_recurrentes(secret: str = "", authorization: str = Header("")):
    _validar_cron(secret, authorization)
    hoy = datetime.now().strftime("%Y-%m-%d")
    emitidas = 0
    errores = 0
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
                    uid = u["id"]
                    error_msg = None
                    try:
                        cli = supabase.table("clientes").select("*").eq("id", rec["cliente_id"]).eq("user_id", uid).single().execute()
                        if not cli.data:
                            continue
                        perf = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
                        emisor = perf.data or {}
                        from app.afip import generar_factura_afip
                        res = generar_factura_afip(
                            cli.data.get("cuit",""), cli.data.get("nombre",""),
                            rec["tipo"], rec["importe"],
                            cli.data.get("condicion_iva","Consumidor Final"),
                            rec.get("descripcion",""), 0,
                            fiscal=_fiscal_cfg_emisor(emisor),
                        )
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
                        crear_notificacion(uid, "factura_programada", f"Factura recurrente #{res['numero']} emitida", f"Se generó la factura a {cli.data.get('nombre', '')} por ${rec['importe']:,.2f}", "/facturas")
                    except Exception as e:
                        error_msg = str(e)[:200]
                        errores += 1
                        logger.error(f"Error factura recurrente user={uid} cliente={rec.get('cliente_id')}: {error_msg}")
                        crear_notificacion(uid, "error", "Error en factura recurrente", f"No se pudo generar la factura a {cli.data.get('nombre', '') if cli.data else 'Cliente'} por ${rec['importe']:,.2f}. Motivo: {error_msg}", "/facturas")
                        perf = supabase.table("perfiles").select("telefono").eq("id", uid).single().execute()
                        import re
                        telefono = re.sub(r'[^0-9]', '', (perf.data or {}).get("telefono", "")) if perf.data else ""
                        if telefono:
                            from app.whatsapp import enviar_whatsapp
                            try:
                                await enviar_whatsapp(
                                    telefono,
                                    f"⚠️ *Error en factura recurrente*\n\nNo pudimos emitir la factura para *{cli.data.get('nombre', '') if cli.data else 'Cliente'}* por ${rec['importe']:,.2f}.\n\nMotivo: {error_msg}\n\nPor favor, revisá la factura manualmente en TraceLess."
                                )
                            except Exception:
                                pass
            if changed:
                meta["recurrentes"] = recs
                _httpx.put(f"{_URL}/auth/v1/admin/users/{u['id']}",
                    headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
                    json={"app_metadata": meta})
        offset += limit
    return {"ok": True, "emitidas": emitidas, "errores": errores}

@router.get("/procesar-programadas")
async def procesar_programadas(secret: str = "", authorization: str = Header("")):
    _validar_cron(secret, authorization)
    hoy = datetime.now().strftime("%Y-%m-%d")
    procesadas = 0
    errores = 0
    import asyncio

    res = supabase.table("facturas").select("*, clientes!inner(nombre, apellido, cuit, telefono, email, condicion_iva)").eq("estado", "programada").lte("scheduled_send", hoy).execute()
    tasks = []
    for f in res.data:
        uid = f["user_id"]
        try:
            cli = f.get("clientes") or {}
            perfil = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
            emisor = perfil.data or {"nombre": "Usuario", "cuit": "", "condicion_iva": "Responsable Inscripto"}
            import json as _json
            desc_raw = f.get("descripcion", "")
            try:
                parsed = _json.loads(desc_raw)
                desc = parsed.get("d", "Honorarios")
                detalles = parsed.get("i", [])
            except Exception:
                desc = desc_raw
                detalles = []

            ultimo_numero = _ultimo_numero_usuario(uid)

            from app.afip import generar_factura_afip
            afip_result = generar_factura_afip(
                cliente_cuit=cli.get("cuit", ""),
                cliente_nombre=f"{cli.get('nombre', '')} {cli.get('apellido', '')}",
                tipo=f.get("tipo", 6),
                importe=f["total"],
                condicion_iva=cli.get("condicion_iva", "Consumidor Final"),
                descripcion=desc,
                ultimo_numero=ultimo_numero,
                fiscal=_fiscal_cfg_emisor(emisor),
            )

            from app.mercadopago import crear_link_pago_factura
            mp_link = ""
            try:
                email_cliente = cli.get("email", "")
                mp_link = crear_link_pago_factura(monto=f["total"], descripcion=desc, factura_id=f["id"], email_cliente=email_cliente)
            except Exception:
                pass

            supabase.table("facturas").update({
                "numero": afip_result["numero"],
                "cae": afip_result["cae"],
                "cae_vencimiento": afip_result["cae_vencimiento"],
                "neto": afip_result["neto"],
                "iva": afip_result["iva"],
                "fecha": hoy,
                "vencimiento": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "estado": "emitida",
                "mp_link": mp_link,
            }).eq("id", f["id"]).execute()

            from app.pdf import guardar_factura_html
            html_url = guardar_factura_html(
                factura={**f, "id": f["id"], "numero": afip_result["numero"], "cae": afip_result["cae"], "tipo_nombre": _tipo_nombre(f.get("tipo", 6))},
                cliente=cli,
                emisor=emisor,
            )
            supabase.table("facturas").update({"pdf_url": html_url}).eq("id", f["id"]).execute()

            plan = get_user_plan(uid)
            base_url = os.getenv("BASE_URL", "https://www.traceless.com.ar")
            pdf_url_full = f"{base_url}/api/facturas/{f['id']}/public"
            enviado = False

            # Intentar WhatsApp si el plan lo permite
            if plan["whatsapp"]:
                telefono = cli.get("telefono", "")
                if telefono:
                    wp_ok, _ = can_send_whatsapp(uid)
                    if wp_ok:
                        tasks.append(enviar_factura_whatsapp(
                            telefono=telefono,
                            cliente=cli.get("nombre", ""),
                            numero=afip_result["numero"],
                            total=f["total"],
                            pdf_url=pdf_url_full,
                            fecha=hoy,
                            mp_link=mp_link,
                            vencimiento=f.get("vencimiento", ""),
                        ))
                        log_whatsapp_send(uid, f["id"], "factura")
                        enviado = True

            # Si no se envió por WhatsApp, intentar por email
            if not enviado:
                email_cliente = cli.get("email", "")
                if email_cliente:
                    from app.email_sender import enviar_factura_email
                    enviar_factura_email(
                        email_cliente=email_cliente,
                        nombre_cliente=cli.get("nombre", ""),
                        numero=afip_result["numero"],
                        total=f["total"],
                        pdf_url=pdf_url_full,
                        mp_link=mp_link,
                        emisor_nombre=emisor.get("nombre", ""),
                    )
                    enviado = True

            if enviado:
                supabase.table("facturas").update({"estado": "enviada"}).eq("id", f["id"]).execute()
            procesadas += 1
            crear_notificacion(uid, "factura_programada", f"Factura programada #{afip_result['numero']} procesada", f"Se emitió la factura a {cli.get('nombre', '')} por ${f['total']:,.2f}", "/facturas")
        except Exception as e:
            logger.error(f"Error procesando factura programada {f['id']}: {e}")
            errores += 1

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    return {"ok": True, "procesadas": procesadas, "errores": errores}

@router.get("/estadisticas")
def estadisticas(authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("facturas").select("total, fecha, estado, tipo").eq("user_id", uid).execute()
    facturas = res.data
    _NC_TIPOS = {3, 8, 13, 21}  # Notas de crédito: no suman "por cobrar"
    totales = sum(f["total"] for f in facturas if f["estado"] != "anulada")
    emitidas = sum(1 for f in facturas if f["estado"] == "emitida")
    enviadas = sum(1 for f in facturas if f["estado"] == "enviada")
    vencidas = sum(1 for f in facturas if f["estado"] == "vencida")
    pagadas = sum(1 for f in facturas if f["estado"] == "pagada")
    anuladas = sum(1 for f in facturas if f["estado"] == "anulada")
    notas_credito = sum(1 for f in facturas if f["tipo"] in _NC_TIPOS)
    por_cobrar = sum(1 for f in facturas if f["estado"] in ("emitida", "enviada", "vencida") and f["tipo"] not in _NC_TIPOS)
    return {"totales": totales, "emitidas": emitidas, "enviadas": enviadas, "vencidas": vencidas, "pagadas": pagadas, "anuladas": anuladas, "por_cobrar": por_cobrar, "notas_credito": notas_credito}

@router.get("/resumen")
def resumen(authorization: str = Header("")):
    uid = get_user_id(authorization)
    now = datetime.now()
    anio = now.year
    mes_actual = now.month
    res = supabase.table("facturas").select("total, fecha, estado, tipo").eq("user_id", uid).execute()
    facturas = res.data
    _NC_TIPOS = {3, 8, 13, 21}
    mes_actual_total = 0
    mes_anterior_total = 0
    anio_total = 0
    for f in facturas:
        if f["estado"] == "anulada" or f["tipo"] in _NC_TIPOS:
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
    meses_es = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    return {
        "mes_actual": round(mes_actual_total, 2),
        "mes_anterior": round(mes_anterior_total, 2),
        "anio": round(anio_total, 2),
        "mes_nombre": meses_es[now.month],
    }

@router.get("/analytics/clientes")
def analytics_clientes(authorization: str = Header("")):
    uid = get_user_id(authorization)
    if not has_feature(uid, "analytics"):
        raise HTTPException(403, "Analytics disponible en plan Profesional y Equipo")
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
        elif f["estado"] in ("emitida", "enviada", "vencida"):
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
        elif f["estado"] in ("emitida", "enviada", "vencida"):
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
    return {1: "A", 3: "NC A", 6: "B", 8: "NC B", 11: "C", 13: "NC C", 19: "E", 21: "NC E"}.get(tipo, "B")
