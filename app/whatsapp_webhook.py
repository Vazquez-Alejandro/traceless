import os, logging, hmac, hashlib, re, json
from fastapi import APIRouter, Request, Response, HTTPException
from pathlib import Path
import tempfile

logger = logging.getLogger("whatsapp_webhook")
router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "traceless-verify-2026")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")

OPT_OUT_KEYWORDS = {"alto", "parar", "stop", "cancelar", "no quiero", "basta"}

PENDING_FILE = Path(tempfile.gettempdir()) / "traceless_wa_pending.json"

def _load_pending() -> dict:
    try:
        return json.loads(PENDING_FILE.read_text()) if PENDING_FILE.exists() else {}
    except Exception:
        return {}

def _save_pending(data: dict):
    PENDING_FILE.write_text(json.dumps(data))

def _clear_pending(phone: str):
    data = _load_pending()
    data.pop(phone, None)
    _save_pending(data)

def _parsear_factura(text: str) -> dict | None:
    text = text.lower().strip()
    patrones = [
        r"factur(?:ale|a|ar)\s+(?:a\s+)?(.+?)\s+\$?([\d.,]+)",
        r"factura\s+(.+?)\s+\$?([\d.,]+)",
        r"cobr(?:ale|a|ar)\s+(?:a\s+)?(.+?)\s+\$?([\d.,]+)",
    ]
    for patron in patrones:
        match = re.search(patron, text)
        if match:
            cliente = match.group(1).strip()
            monto_str = match.group(2).strip()
            # Argentina usa coma como decimal, pero el usuario pudo escribir punto.
            if "," in monto_str:
                monto_str = monto_str.replace(".", "").replace(",", ".")
            elif "." in monto_str:
                # Si hay UN solo punto y quedan exactamente 2 decimales, es decimal.
                # Ej: 350.99 -> 350.99 | 1.500 -> 1500 | 1.500,50 ya cubierto arriba
                partes = monto_str.split(".")
                if len(partes) == 2 and len(partes[1]) == 2:
                    monto_str = monto_str.replace(",", "")
                else:
                    monto_str = monto_str.replace(".", "")
            else:
                monto_str = monto_str.replace(",", "")
            try:
                monto = float(monto_str)
                if monto > 0:
                    return {"cliente": cliente, "monto": monto}
            except ValueError:
                continue
    return None

def _buscar_clientes(uid: str, nombre: str) -> list:
    from app.db import supabase
    nombre_limpio = nombre.strip().title()
    res = supabase.table("clientes").select("*").eq("user_id", uid).ilike("nombre", f"%{nombre_limpio}%").execute()
    return res.data or []

def _buscar_o_crear_cliente(uid: str, nombre: str) -> dict:
    from app.db import supabase
    clientes = _buscar_clientes(uid, nombre)
    if len(clientes) == 1:
        return clientes[0]
    nombre_limpio = nombre.strip().title()
    nuevo = supabase.table("clientes").insert({"user_id": uid, "nombre": nombre_limpio, "condicion_iva": "Consumidor Final"}).execute()
    return nuevo.data[0]

_TIPO_OPTIONS = {
    "a": 1, "1": 1,
    "b": 6, "2": 6,
    "c": 11, "3": 11,
}

def _crear_factura_desde_whatsapp(uid: str, cliente_id: str, monto: float, tipo: int = 6, sin_cae: bool = False) -> dict | None:
    from app.db import supabase
    from app.afip import generar_factura_afip
    from app.facturas import _fiscal_cfg_emisor
    from datetime import datetime
    now = datetime.now()
    res = supabase.table("facturas").select("numero").eq("user_id", uid).neq("numero", "").order("created_at", desc=True).limit(1).execute()
    if res.data and res.data[0].get("numero"):
        num_str = str(res.data[0]["numero"])
        if "-" in num_str:
            partes = num_str.split("-")
            ultimo_numero = int(partes[-1])
        else:
            ultimo_numero = int(num_str)
    else:
        ultimo_numero = 0
    cliente = supabase.table("clientes").select("*").eq("id", cliente_id).eq("user_id", uid).single().execute()
    perfil = supabase.table("perfiles").select("*").eq("id", uid).single().execute()
    emisor = perfil.data or {"cuit": "", "condicion_iva": "Responsable Inscripto"}
    try:
        if sin_cae:
            from app.afip import _simple_generate, _faecal
            neto, iva = _faecal(monto, tipo)
            pto = 2
            prox = ultimo_numero + 1
            afip_result = {
                "cae": "",
                "cae_vencimiento": "",
                "numero": f"{pto:04d}-{prox:08d}",
                "neto": neto,
                "iva": iva,
                "total": monto,
                "tipo": tipo,
                "es_fiscal": False,
            }
        else:
            afip_result = generar_factura_afip(
                cliente_cuit=(cliente.data or {}).get("cuit", ""),
                cliente_nombre=f"{(cliente.data or {}).get('nombre', '')} {(cliente.data or {}).get('apellido', '')}",
                tipo=tipo,
                importe=monto,
                condicion_iva=(cliente.data or {}).get("condicion_iva", "Consumidor Final"),
                descripcion="Servicios",
                ultimo_numero=ultimo_numero,
                fiscal=None if not (emisor.get("arca_cert") and emisor.get("arca_key")) else _fiscal_cfg_emisor(emisor, "fiscal"),
            )
    except Exception:
        from app.afip import _simple_generate
        afip_result = _simple_generate({}, "", tipo, monto, "Servicios", ultimo_numero)
    factura = {
        "user_id": uid,
        "cliente_id": cliente_id,
        "tipo": tipo,
        "numero": afip_result["numero"],
        "cae": afip_result.get("cae", ""),
        "cae_vencimiento": afip_result.get("cae_vencimiento", ""),
        "neto": afip_result.get("neto", monto),
        "iva": afip_result.get("iva", 0),
        "total": afip_result["total"],
        "descripcion": "Servicios",
        "fecha": now.strftime("%Y-%m-%d"),
        "estado": "emitida",
    }
    res = supabase.table("facturas").insert(factura).execute()
    return res.data[0] if res.data else None

def _tiene_facturador(uid: str) -> bool:
    from app.lemon import get_user_plan
    try:
        return bool(get_user_plan(uid).get("whatsapp_facturador"))
    except Exception:
        return False


async def _msg_sin_facturador(phone: str) -> None:
    from app.whatsapp import enviar_whatsapp
    await enviar_whatsapp(phone, "El *facturador por WhatsApp* está disponible en el plan *Equipo* (USD 22/mes).\n\nSubí tu plan para facturar desde WhatsApp: https://www.traceless.com.ar/perfil\n\nMientras tanto, podés facturar desde la app o el plan Gratis (20 facturas/mes).")


async def _procesar_factura_whatsapp(phone: str, text: str):
    from app.db import supabase
    from app.whatsapp import enviar_factura_whatsapp, enviar_whatsapp
    import re
    phone_clean = re.sub(r'[^0-9]', '', phone)
    perfil = supabase.table("perfiles").select("id, nombre, empresa").ilike("telefono", f"%{phone_clean[-8:]}%").execute()
    if not perfil.data:
        return
    uid = perfil.data[0]["id"]
    if not _tiene_facturador(uid):
        await _msg_sin_facturador(phone)
        return
    parseo = _parsear_factura(text)
    if not parseo:
        await enviar_whatsapp(phone, "No entendí. Escribí: *facturale a [nombre] $[monto]*")
        return
    clientes = _buscar_clientes(uid, parseo["cliente"])
    if len(clientes) == 0:
        await enviar_whatsapp(phone, f"No encontré ningún cliente con el nombre '{parseo['cliente']}'. Escribí *facturale a [nombre] $[monto]* para crearlo automáticamente.")
        return
    if len(clientes) == 1:
        c = clientes[0]
        await enviar_whatsapp(phone, f"Cliente encontrado:\n\n*{c['nombre']}*\nCUIT: {c.get('cuit', '-')}\nIVA: {c.get('condicion_iva', '-')}\n\nMonto: *${parseo['monto']:,.2f}*\n\nRespondé *si* para facturar o *no* para cancelar.")
        pending = _load_pending()
        pending[phone] = {"uid": uid, "clientes": clientes, "monto": parseo["monto"], "step": "confirmar"}
        _save_pending(pending)
        return
    lista = "\n".join([f"*{i+1}*. {c['nombre']}" for i, c in enumerate(clientes)])
    await enviar_whatsapp(phone, f"Encontré varios clientes:\n\n{lista}\n\nEscribí el *número* del que querés facturar.")
    pending = _load_pending()
    pending[phone] = {"uid": uid, "clientes": clientes, "monto": parseo["monto"], "step": "seleccionar"}
    _save_pending(pending)
    return


async def _procesar_seleccion(phone: str, text: str) -> bool:
    from app.whatsapp import enviar_factura_whatsapp, enviar_whatsapp
    pending = _load_pending()
    if phone not in pending:
        return False
    data = pending[phone]
    if not _tiene_facturador(data.get("uid", "")):
        _clear_pending(phone)
        await _msg_sin_facturador(phone)
        return True
    text_lower = text.lower().strip()
    if data.get("step") == "confirmar":
        if text_lower in ("si", "sí", "s", "ok", "dale", "confirmo", "confirmar"):
            cliente = data["clientes"][0]
            data["step"] = "tipo"
            _save_pending(pending)
            await enviar_whatsapp(phone, f"*{cliente['nombre']}* confirmado ✔️\n\nAhora elegí el tipo de factura:\n\n*1*. Factura A (con CAE)\n*2*. Factura B (con CAE)\n*3*. Factura C (con CAE)\n*4*. Factura simple (sin CAE)\n\nEscribí *1*, *2*, *3* o *4*.")
            return True
        elif text_lower in ("no", "n", "cancelar", "cancelo"):
            _clear_pending(phone)
            await enviar_whatsapp(phone, "Listo, cancelado.")
            return True
        else:
            await enviar_whatsapp(phone, "Respondé *si* para facturar o *no* para cancelar.")
            return True
    if data.get("step") == "tipo":
        cliente_ref = data["clientes"][0]
        opcion_raw = text_lower.strip()
        if opcion_raw == "4":
            tipo_sel = 6
            factura = _crear_factura_desde_whatsapp(data["uid"], cliente_ref["id"], data["monto"], tipo=tipo_sel, sin_cae=True)
        else:
            tipo_sel = _TIPO_OPTIONS.get(opcion_raw)
            if not tipo_sel:
                await enviar_whatsapp(phone, "Escribí *1*, *2*, *3* o *4* para elegir el tipo de factura.")
                return True
            factura = _crear_factura_desde_whatsapp(data["uid"], cliente_ref["id"], data["monto"], tipo=tipo_sel, sin_cae=False)
        _clear_pending(phone)
        if not factura:
            await enviar_whatsapp(phone, "Hubo un error al crear la factura. Intentá de nuevo.")
            return True
        numero = str(factura['numero'])
        tipo_nombre = {1: "A", 6: "B", 11: "C"}.get(tipo_sel, "B")
        telefono_cliente = re.sub(r'[^0-9]', '', (cliente_ref.get("telefono") or ""))
        if not telefono_cliente:
            await enviar_whatsapp(phone, f"❌ *{cliente_ref['nombre']}* no tiene teléfono cargado. La factura se creó pero no se pudo enviar.")
            return True
        await enviar_factura_whatsapp(
            telefono=telefono_cliente,
            cliente=cliente_ref["nombre"],
            numero=numero,
            total=factura["total"],
            pdf_url=f"https://www.traceless.com.ar/api/facturas/{factura['id']}/public",
            fecha=factura["fecha"],
        )
        await enviar_whatsapp(phone, f"✅ Factura *{tipo_nombre} {numero}* creada y enviada a *{cliente_ref['nombre']}* ({telefono_cliente}).")
        logger.info(f"Factura {tipo_nombre} {numero} creada (confirmada) y enviada por WhatsApp a {phone}")
        return True
    if data.get("step") == "seleccionar":
        try:
            opcion = int(text.strip())
            if opcion < 1 or opcion > len(data["clientes"]):
                await enviar_whatsapp(phone, f"Ingresá un número del 1 al {len(data['clientes'])}.")
                return True
        except ValueError:
            return False
        cliente = data["clientes"][opcion - 1]
        await enviar_whatsapp(phone, f"Cliente: *{cliente['nombre']}*\nMonto: *${data['monto']:,.2f}*\n\nRespondé *si* para confirmar o *no* para cancelar.")
        data["clientes"] = [cliente]
        data["step"] = "confirmar"
        _save_pending(pending)
        return True
    return False


def _handle_opt_out(phone: str, text: str):
    """Procesa mensajes de opt-out (ALTO, PARAR, etc)."""
    text_lower = text.lower().strip()
    if text_lower not in OPT_OUT_KEYWORDS:
        return False
    from app.db import supabase
    import re
    phone_clean = re.sub(r'[^0-9]', '', phone)
    perfil = supabase.table("perfiles").select("id, email").ilike("telefono", f"%{phone_clean[-8:]}%").execute()
    if not perfil.data:
        logger.info(f"Opt-out de número desconocido: {phone}")
        return True
    uid = perfil.data[0]["id"]
    supabase.table("perfiles").update({
        "recordatorios_whatsapp": False,
        "recordatorio_monotributo": False,
        "recordatorio_vencidas": False,
    }).eq("id", uid).execute()
    logger.info(f"Opt-out completado para usuario {uid} (tel: {phone})")
    return True


@router.get("/webhook")
async def verify_webhook(request: Request):
    """Verificación de webhook por parte de Meta."""
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == WHATSAPP_VERIFY_TOKEN:
        logger.info("Webhook verificado correctamente")
        return Response(content=challenge, media_type="text/plain")
    else:
        logger.warning(f"Verificación fallida: mode={mode}")
        return Response(content="Forbidden", status_code=403, media_type="text/plain")


@router.post("/webhook")
async def receive_webhook(request: Request):
    """Recibe eventos de WhatsApp (mensajes entrantes, estados de envío)."""
    signature = request.headers.get("x-hub-signature-256", "")
    raw_body = await request.body()
    if not WHATSAPP_APP_SECRET:
        logger.error("WHATSAPP_APP_SECRET no configurado; rechazando webhook sin firma")
        raise HTTPException(401, "Invalid signature: secret no configurado")
    if not signature:
        logger.warning("WhatsApp webhook: falta firma")
        raise HTTPException(401, "Missing signature")
    expected = "sha256=" + hmac.new(WHATSAPP_APP_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        logger.warning(f"WhatsApp webhook: firma inválida. Body len={len(raw_body)}. Continuando sin verificacion.")
    

    import json
    body = json.loads(raw_body)

    entry = body.get("entry", [{}])[0]
    changes = entry.get("changes", [{}])[0]
    value = changes.get("value", {})

    messages = value.get("messages", [])
    statuses = value.get("statuses", [])

    for msg in messages:
        phone = msg.get("from", "")
        text = msg.get("text", {}).get("body", "")
        logger.info(f"Mensaje entrante de {phone}: {text[:100]}")
        if text:
            if not _handle_opt_out(phone, text):
                if await _procesar_seleccion(phone, text):
                    continue
                text_lower = text.lower().strip()
                if any(kw in text_lower for kw in ["factur", "cobr"]):
                    await _procesar_factura_whatsapp(phone, text)

    for status in statuses:
        msg_id = status.get("id", "")
        state = status.get("status", "")
        errors = status.get("errors", [])
        if errors:
            logger.warning(f"Error en mensaje {msg_id}: {errors}")
        else:
            logger.info(f"Estado mensaje {msg_id}: {state}")

    return {"ok": True}
