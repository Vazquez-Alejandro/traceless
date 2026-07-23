import os, logging
from fastapi import APIRouter, Request, Response

logger = logging.getLogger("whatsapp_webhook")
router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "traceless-verify-2026")

OPT_OUT_KEYWORDS = {"alto", "parar", "stop", "cancelar", "no quiero", "basta"}


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
    body = await request.json()

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
            _handle_opt_out(phone, text)

    for status in statuses:
        msg_id = status.get("id", "")
        state = status.get("status", "")
        errors = status.get("errors", [])
        if errors:
            logger.warning(f"Error en mensaje {msg_id}: {errors}")
        else:
            logger.info(f"Estado mensaje {msg_id}: {state}")

    return {"ok": True}
