import os
import logging
import httpx
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request, HTTPException, Header
from app.db import supabase, _URL, _SERVICE_KEY, get_user_id
from app.notifications import crear_notificacion

logger = logging.getLogger("mercadopago")

router = APIRouter(prefix="/api/mercadopago", tags=["mercadopago"])

MP_TOKEN = os.getenv("MP_ACCESS_TOKEN", "")
MP_WEBHOOK_SECRET = os.getenv("MP_WEBHOOK_SECRET", "")

MP_BASE = "https://api.mercadopago.com"

# Precios en ARS por plan (actualizables)
MP_PRICES = {
    "pro": {"amount": 15000, "name": "Profesional"},
    "team": {"amount": 29000, "name": "Equipo"},
}


def _mp_headers():
    return {
        "Authorization": f"Bearer {MP_TOKEN}",
        "Content-Type": "application/json",
    }


@router.post("/checkout")
def crear_checkout(plan_key: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    if plan_key not in MP_PRICES:
        raise HTTPException(400, "Plan no válido")
    if not MP_TOKEN:
        raise HTTPException(500, "Mercado Pago no configurado (falta MP_ACCESS_TOKEN)")

    plan = MP_PRICES[plan_key]
    perfil = supabase.table("perfiles").select("email").eq("id", uid).single().execute()
    email = perfil.data.get("email", "") if perfil.data else ""

    body = {
        "items": [
            {
                "id": plan_key,
                "title": f"TraceLess Plan {plan['name']}",
                "quantity": 1,
                "unit_price": plan["amount"],
                "currency_id": "ARS",
            }
        ],
        "payer": {"email": email},
        "external_reference": uid,
        "statement_descriptor": "TRACELESS",
        "expires": True,
        "expiration_date_from": datetime.now(timezone.utc).isoformat(),
        "expiration_date_to": datetime(2026, 12, 31, tzinfo=timezone.utc).isoformat(),
    }

    r = httpx.post(f"{MP_BASE}/checkout/preferences", json=body, headers=_mp_headers(), timeout=15)
    if r.status_code not in (200, 201):
        logger.error(f"MP checkout error: {r.status_code} {r.text}")
        raise HTTPException(500, "Error al crear preferencia de pago")

    data = r.json()
    return {"url": data["init_point"], "sandbox_url": data.get("sandbox_init_point")}


@router.post("/create-subscription")
def crear_suscripcion(plan_key: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    if plan_key not in MP_PRICES:
        raise HTTPException(400, "Plan no válido")
    if not MP_TOKEN:
        raise HTTPException(500, "Mercado Pago no configurado")

    plan = MP_PRICES[plan_key]
    perfil = supabase.table("perfiles").select("email").eq("id", uid).single().execute()
    email = perfil.data.get("email", "") if perfil.data else ""

    # Crear preaprobación para débito automático
    body = {
        "reason": f"TraceLess Plan {plan['name']}",
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": plan["amount"],
            "currency_id": "ARS",
        },
        "payer_email": email,
        "external_reference": res.user.id,
        "statement_descriptor": "TRACELESS",
    }

    r = httpx.post(f"{MP_BASE}/preapproval", json=body, headers=_mp_headers(), timeout=15)
    if r.status_code not in (200, 201):
        logger.error(f"MP subscription error: {r.status_code} {r.text}")
        raise HTTPException(500, "Error al crear suscripción")

    data = r.json()
    return {"url": data["init_point"], "id": data.get("id")}


@router.post("/webhook")
async def mp_webhook(request: Request):
    body = await request.body()

    # Verificar firma del webhook
    if MP_WEBHOOK_SECRET:
        signature = request.headers.get("x-signature", "")
        if not signature:
            logger.warning("MP webhook: missing signature")
            raise HTTPException(401, "Firma requerida")
        sig = hmac.HMAC(MP_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(f"sha256={sig}", signature):
            logger.warning("MP webhook: invalid signature")
            raise HTTPException(401, "Firma inválida")

    import json
    data = json.loads(body)
    logger.info(f"MP webhook received: {data.get('type', 'unknown')}")

    event_type = data.get("type", "")
    data_id = data.get("data", {}).get("id", "")

    if event_type == "payment":
        r = httpx.get(f"{MP_BASE}/v1/payments/{data_id}", headers=_mp_headers(), timeout=15)
        if r.status_code == 200:
            payment = r.json()
            status = payment.get("status", "")
            external_ref = payment.get("external_reference", "")
            if status == "approved" and external_ref:
                if external_ref.startswith("factura_"):
                    factura_id = external_ref.replace("factura_", "")
                    try:
                        supabase.table("facturas").update({"estado": "pagada", "fecha_pago": datetime.now().strftime("%Y-%m-%d")}).eq("id", factura_id).execute()
                        logger.info(f"Factura {factura_id} pagada via MP")
                        try:
                            f_data = supabase.table("facturas").select("numero, total, user_id").eq("id", factura_id).single().execute()
                            if f_data.data:
                                crear_notificacion(f_data.data["user_id"], "pago_recibido", f"Factura #{f_data.data['numero']} pagada", f"Se recibió el pago de ${f_data.data['total']:,.2f} vía MercadoPago", "/facturas")
                        except Exception:
                            pass
                    except Exception as e:
                        logger.error(f"Error actualizando factura {factura_id}: {e}")
                elif external_ref.startswith("credito_"):
                    user_id = external_ref.replace("credito_", "")
                    amount = payment.get("transaction_amount", 0)
                    try:
                        from app.creditos import agregar_credito
                        agregar_credito(user_id, amount)
                        logger.info(f"Crédito ${amount:,.0f} acreditado a usuario {user_id}")
                        crear_notificacion(user_id, "pago_recibido", f"Créditos ${amount:,.0f} acreditados", "Se acreditaron los créditos en tu cuenta", "/perfil")
                    except Exception as e:
                        logger.error(f"Error acreditando crédito a {user_id}: {e}")
                else:
                    _set_user_plan_mp(external_ref, "pro")
                    logger.info(f"Payment approved for user {external_ref}")
                    crear_notificacion(external_ref, "plan_renovado", "Plan Profesional activado", "Tu plan ha sido activado exitosamente", "/perfil")

    elif event_type == "subscription_preapproval":
        r = httpx.get(f"{MP_BASE}/preapproval/{data_id}", headers=_mp_headers(), timeout=15)
        if r.status_code == 200:
            sub = r.json()
            status = sub.get("status", "")
            external_ref = sub.get("external_reference", "")
            if status == "authorized" and external_ref:
                _set_user_plan_mp(external_ref, "pro")
                crear_notificacion(external_ref, "plan_renovado", "Suscripción activada", "Tu suscripción está activa", "/perfil")
            elif status in ("cancelled", "paused") and external_ref:
                _set_user_plan_mp(external_ref, "free")
                crear_notificacion(external_ref, "plan_cancelado", "Suscripción cancelada", "Tu plan ha vuelto a Gratis", "/perfil")

    return {"ok": True}


def crear_link_pago_factura(monto: float, descripcion: str, factura_id: str, email_cliente: str = "") -> str:
    if not MP_TOKEN:
        return ""
    body = {
        "items": [{
            "title": f"Factura {descripcion}" if descripcion else "Factura",
            "quantity": 1,
            "unit_price": monto,
            "currency_id": "ARS",
        }],
        "external_reference": f"factura_{factura_id}",
        "expires": True,
        "expiration_date_from": datetime.now(timezone.utc).isoformat(),
        "expiration_date_to": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "back_urls": {"success": "https://www.traceless.com.ar/facturas"},
        "auto_return": "approved",
    }
    if email_cliente:
        body["payer"] = {"email": email_cliente}
    r = httpx.post(f"{MP_BASE}/checkout/preferences", json=body, headers=_mp_headers(), timeout=15)
    if r.status_code not in (200, 201):
        logger.error(f"Error creando link pago factura: {r.status_code} {r.text}")
        return ""
    return r.json()["init_point"]


def _set_user_plan_mp(user_id: str, plan_key: str):
    try:
        r = httpx.get(
            f"{_URL}/auth/v1/admin/users/{user_id}",
            headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"},
        )
        if r.status_code == 200:
            meta = r.json().get("app_metadata", {})
            meta["plan"] = plan_key
            meta["payment_provider"] = "mercadopago"
            httpx.put(
                f"{_URL}/auth/v1/admin/users/{user_id}",
                headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
                json={"app_metadata": meta},
            )
            logger.info(f"Plan {plan_key} set via MP for user {user_id}")
    except Exception as e:
        logger.error(f"Error setting plan via MP: {e}")


@router.get("/prices")
def precios_ars():
    return {"prices": MP_PRICES, "currency": "ARS"}
