"""Cobro server-to-server para OperativaAI (y otros servicios).

Autenticación por API key de servicio (X-Service-Key), NO por JWT de usuario.
Crea una preferencia one-off de Mercado Pago para un turno y devuelve el link
de pago. La facturación AFIP por negocio queda como seguimiento (ver notas).
"""
import os
import logging
import httpx
from fastapi import APIRouter, Header, HTTPException

from app.mercadopago import MP_BASE, MP_TOKEN, _mp_headers

logger = logging.getLogger("cobro_api")

SERVICE_API_KEY = os.getenv("TRACLESS_SERVICE_API_KEY", "")

router = APIRouter(prefix="/api/cobro", tags=["cobro"])


def _require_service_key(x_service_key: str = Header("")):
    if not SERVICE_API_KEY:
        raise HTTPException(503, "Cobro server-to-server no configurado (falta TRACLESS_SERVICE_API_KEY)")
    if not x_service_key or x_service_key != SERVICE_API_KEY:
        raise HTTPException(401, "API key de servicio inválida")


def _payer_email(client_phone: str, email: str | None) -> str:
    if email:
        return email
    digits = "".join(ch for ch in (client_phone or "")) 
    safe = digits.replace("+", "").replace(" ", "").replace("-", "")
    return f"turno-{safe}@operativa.ai"


@router.post("/turno")
def cobrar_turno(
    body: dict,
    x_service_key: str = Header(""),
):
    _require_service_key(x_service_key)
    if not MP_TOKEN:
        raise HTTPException(503, "Mercado Pago no configurado (falta MP_ACCESS_TOKEN)")

    business_name = (body.get("business_name") or body.get("cliente") or "Negocio")
    client_phone = body.get("client_phone") or body.get("telefono") or ""
    service_name = body.get("service_name") or "Turno"
    amount = body.get("amount") or body.get("monto") or 0
    currency = (body.get("currency") or "ARS").upper()
    date = body.get("date") or ""
    time = body.get("time") or ""
    email = body.get("email")

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        raise HTTPException(400, "Monto inválido")
    if amount <= 0:
        raise HTTPException(400, "Monto debe ser mayor a 0")

    concepto = body.get("concepto") or f"{service_name} {date} {time}".strip()

    pref = {
        "items": [
            {
                "id": "turno",
                "title": concepto[:256] or service_name,
                "quantity": 1,
                "unit_price": amount,
                "currency_id": currency,
            }
        ],
        "payer": {"email": _payer_email(client_phone, email)},
        "external_reference": f"operativa:{business_name}:{client_phone}:{date}:{time}"[:256],
        "statement_descriptor": "OPERATIVA",
        "back_urls": {
            "success": os.getenv("BASE_URL", "https://www.traceless.com.ar") + "/perfil",
            "pending": os.getenv("BASE_URL", "https://www.traceless.com.ar") + "/perfil",
            "failure": os.getenv("BASE_URL", "https://www.traceless.com.ar") + "/perfil",
        },
        "auto_return": "approved",
        "expires": True,
        "expiration_date_to": None,
    }

    try:
        r = httpx.post(f"{MP_BASE}/checkout/preferences", json=pref, headers=_mp_headers(), timeout=15)
    except Exception as e:
        logger.error("MP error: %s", e)
        raise HTTPException(502, "No se pudo contactar a Mercado Pago")

    if r.status_code not in (200, 201):
        logger.error("MP pref error %s %s", r.status_code, r.text)
        raise HTTPException(502, "Error al crear la preferencia de pago")

    data = r.json()
    return {
        "payment_url": data.get("init_point"),
        "sandbox_url": data.get("sandbox_init_point"),
        "preference_id": data.get("id"),
        "business_name": business_name,
        "client_phone": client_phone,
        "amount": amount,
        "currency": currency,
    }
