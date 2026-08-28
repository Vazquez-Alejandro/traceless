import os
import logging
import json as _json
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

from app.dolares import ars_from_usd, PRICES_USD


def MP_PRICES(mode: str = "ars"):
    """Devuelve los precios por plan (obsoleto a mantener compatibilidad)."""
    out = {}
    for key, cfg in PRICES_USD.items():
        val = ars_from_usd(cfg["usd"]) if mode == "ars" else cfg["usd"]
        out[key] = {
            "amount": val,
            "name": cfg["name"],
            "usd": cfg["usd"],
            "currency": mode.upper(),
        }
    return out


def _monto_ars(plan_key: str) -> int:
    usd = PRICES_USD[plan_key]["usd"]
    return ars_from_usd(usd)


def _parse_plan_ref(external_ref: str) -> tuple[str, str]:
    """Parsea el external_reference de MP: 'traceless_plan:{plan_key}:{uid}'.

    Devuelve (plan_key, uid). Compatible con el viejo formato '{uid}' (plan default 'pro').
    """
    ref = external_ref or ""
    if ref.startswith("traceless_plan:"):
        partes = ref.split(":")
        if len(partes) >= 3:
            plan_key, uid = partes[1], ":".join(partes[2:])
            if plan_key in PRICES_USD:
                return plan_key, uid
    return "pro", ref


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

    plan = PRICES_USD[plan_key]
    perfil = supabase.table("perfiles").select("email").eq("id", uid).single().execute()
    email = perfil.data.get("email", "") if perfil.data else ""

    body = {
        "items": [
            {
                "id": plan_key,
                "title": f"TraceLess Plan {plan['name']}",
                "quantity": 1,
                "unit_price": _monto_ars(plan_key),
                "currency_id": "ARS",
            }
        ],
        "payer": {"email": email},
        "external_reference": f"traceless_plan:{plan_key}:{uid}",
        "statement_descriptor": "TRACELESS",
        "back_urls": {"success": f"{os.getenv('BASE_URL', 'https://www.traceless.com.ar')}/perfil", "pending": f"{os.getenv('BASE_URL', 'https://www.traceless.com.ar')}/perfil", "failure": f"{os.getenv('BASE_URL', 'https://www.traceless.com.ar')}/perfil"},
        "auto_return": "approved",
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
    if plan_key not in PRICES_USD:
        raise HTTPException(400, "Plan no válido")
    if not MP_TOKEN:
        raise HTTPException(500, "Mercado Pago no configurado")

    plan = PRICES_USD[plan_key]
    perfil = supabase.table("perfiles").select("email").eq("id", uid).single().execute()
    email = perfil.data.get("email", "") if perfil.data else ""

    # Crear preaprobación para débito automático
    body = {
        "reason": f"TraceLess Plan {plan['name']}",
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": _monto_ars(plan_key),
            "currency_id": "ARS",
        },
        "payer_email": email,
        "external_reference": f"traceless_plan:{plan_key}:{uid}",
        "statement_descriptor": "TRACELESS",
    }

    r = httpx.post(f"{MP_BASE}/preapproval", json=body, headers=_mp_headers(), timeout=15)
    if r.status_code not in (200, 201):
        logger.error(f"MP subscription error: {r.status_code} {r.text}")
        raise HTTPException(500, "Error al crear suscripción")

    data = r.json()
    preapproval_id = str(data.get("id", ""))

    # Persistir la preaprobación para poder cancelarla luego
    try:
        import json as _json
        supabase.table("cache").upsert({
            "key": f"mp_preapproval:{uid}",
            "token": _json.dumps({"preapproval_id": preapproval_id, "plan_key": plan_key}),
        }).execute()
    except Exception as e:
        logger.warning(f"No se pudo persistir preapproval de {uid}: {e}")

    return {"url": data["init_point"], "id": preapproval_id}


@router.post("/cancel-subscription")
def cancelar_suscripcion(authorization: str = Header("")):
    uid = get_user_id(authorization)
    if not MP_TOKEN:
        raise HTTPException(500, "Mercado Pago no configurado (falta MP_ACCESS_TOKEN)")

    # Buscar la preaprobación activa del usuario
    try:
        import json as _json
        row = supabase.table("cache").select("token").eq("key", f"mp_preapproval:{uid}").execute()
        preapproval_id = ""
        if row.data and row.data[0].get("token"):
            preapproval_id = (_json.loads(row.data[0]["token"]).get("preapproval_id", "") or "")
    except Exception:
        preapproval_id = ""

    if not preapproval_id:
        # Fallback: consultar las preaprobaciones autorizadas de MP asociadas por external_reference=uid
        r = httpx.get(
            f"{MP_BASE}/preapproval/search",
            params={"external_reference": uid, "status": "authorized"},
            headers=_mp_headers(), timeout=15,
        )
        if r.status_code == 200 and r.json().get("results"):
            preapproval_id = str(r.json()["results"][0]["id"])
    if not preapproval_id:
        raise HTTPException(404, "No tenés una suscripción activa para cancelar")

    # Cancelar en MercadoPago
    r = httpx.put(
        f"{MP_BASE}/preapproval/{preapproval_id}",
        json={"status": "cancelled"},
        headers=_mp_headers(), timeout=15,
    )
    if r.status_code not in (200, 201):
        logger.error(f"MP cancel error: {r.status_code} {r.text}")
        raise HTTPException(502, "MercadoPago no pudo cancelar la suscripción")

    # Bajar el plan a Gratis
    _set_user_plan_mp(uid, "free")
    from app.lemon import invalidate_plan_cache
    invalidate_plan_cache(uid)

    # Limpiar la referencia guardada
    try:
        supabase.table("cache").delete().eq("key", f"mp_preapproval:{uid}").execute()
    except Exception as e:
        logger.warning(f"No se pudo limpiar cache de preapproval {uid}: {e}")

    crear_notificacion(uid, "plan_cancelado", "Suscripción cancelada",
                       "Tu suscripción se canceló en MercadoPago. Tu plan vuelve a Gratis.", "/perfil")
    logger.info(f"Suscripción de {uid} cancelada (preapproval {preapproval_id})")
    return {"ok": True, "message": "Suscripción cancelada. Volviste al plan Gratis."}


def _notify_operativa(payment: dict):
    """Avisa a OperativaAI que un turno fue pagado (cierra el loop de cobro).

    Se dispara para pagos con external_reference 'operativa:...'. Requiere
    OPERATIVA_WEBHOOK_URL (y opcional OPERATIVA_WEBHOOK_KEY como X-Operativa-Key).
    """
    url = os.getenv("OPERATIVA_WEBHOOK_URL", "")
    if not url:
        logger.info("OPERATIVA_WEBHOOK_URL no configurada: no se notifica a OperativaAI")
        return
    key = os.getenv("OPERATIVA_WEBHOOK_KEY", "")
    headers = {"X-Operativa-Key": key} if key else {}
    payload = {
        "external_reference": payment.get("external_reference", ""),
        "payment_id": str(payment.get("id", "")),
        "status": payment.get("status", ""),
        "amount": payment.get("transaction_amount"),
        "currency": payment.get("currency_id", "ARS"),
        "date_approved": payment.get("date_approved"),
    }
    try:
        r = httpx.post(url, json=payload, headers=headers, timeout=10)
        if r.status_code != 200:
            logger.warning(f"OperativaAI respondió {r.status_code}: {r.text[:200]}")
        else:
            logger.info(f"Pago {payload['payment_id']} notificado a OperativaAI")
    except Exception as e:
        logger.error(f"Notificación a OperativaAI falló: {e}")


@router.post("/webhook")
async def mp_webhook(request: Request):
    body = await request.body()
    import json
    data = json.loads(body)

    # Verificar firma del webhook. MercadoPago firma con el header:
    #   x-signature: ts=<timestamp>,v1=<hmac_sha256>
    # donde el HMAC se calcula sobre el "manifest":
    #   id:<data.id>;ts:<ts>;  (y request-id si viene x-request-id)
    # Fail-closed: si no hay MP_WEBHOOK_SECRET configurado, rechazar el webhook
    # en vez de procesarlo sin validar la firma.
    if not MP_WEBHOOK_SECRET:
        logger.error("MP_WEBHOOK_SECRET no configurado; rechazando webhook sin firma")
        raise HTTPException(401, "Webhook deshabilitado: secreto no configurado")
    signature = request.headers.get("x-signature", "")
    if not signature:
        logger.warning("MP webhook: missing signature")
        raise HTTPException(401, "Firma requerida")
    parts = {}
    for kv in signature.split(","):
        if "=" in kv:
            k, v = kv.strip().split("=", 1)
            parts[k] = v
    ts = parts.get("ts", "")
    v1 = parts.get("v1", "")
    data_id = str(data.get("data", {}).get("id", ""))
    req_id = request.headers.get("x-request-id", "")
    manifest = f"id:{data_id};request-id:{req_id};ts:{ts};"
    sig = hmac.new(MP_WEBHOOK_SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, v1):
        logger.warning("MP webhook: invalid signature")
        raise HTTPException(401, "Firma inválida")

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
                # Idempotencia: evitar duplicar el procesamiento si MP reintenta el webhook
                try:
                    existente = supabase.table("cache").select("token").eq("key", f"mp_paid:{data_id}").execute()
                    if existente.data:
                        logger.info(f"Payment {data_id} ya procesado, se omite")
                        return {"ok": True}
                    supabase.table("cache").insert({
                        "key": f"mp_paid:{data_id}",
                        "token": _json.dumps({"status": "processed"}),
                    }).execute()
                except Exception as e:
                    logger.warning(f"No se pudo verificar idempotencia para {data_id}: {e}")
                if external_ref.startswith("operativa:"):
                    _notify_operativa(payment)
                elif external_ref.startswith("factura_"):
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
                    plan_key, uid = _parse_plan_ref(external_ref)
                    _set_user_plan_mp(uid, plan_key)
                    logger.info(f"Payment approved for user {uid}: plan {plan_key}")
                    crear_notificacion(uid, "plan_renovado", f"Plan {PRICES_USD[plan_key]['name']} activado", "Tu plan ha sido activado exitosamente", "/perfil")

    elif event_type == "subscription_preapproval":
        r = httpx.get(f"{MP_BASE}/preapproval/{data_id}", headers=_mp_headers(), timeout=15)
        if r.status_code == 200:
            sub = r.json()
            status = sub.get("status", "")
            external_ref = sub.get("external_reference", "")
            if status == "authorized" and external_ref:
                plan_key, uid = _parse_plan_ref(external_ref)
                if not uid:
                    plan_key, uid = "pro", external_ref
                # Persistir la preaprobación para permitir cancelación posterior
                try:
                    import json as _json
                    supabase.table("cache").upsert({
                        "key": f"mp_preapproval:{uid}",
                        "token": _json.dumps({"preapproval_id": str(data_id), "plan_key": plan_key}),
                    }).execute()
                except Exception as e:
                    logger.warning(f"No se pudo persistir preapproval (webhook): {e}")
                _set_user_plan_mp(uid, plan_key)
                crear_notificacion(uid, "plan_renovado", "Suscripción activada", "Tu suscripción está activa", "/perfil")
            elif status in ("cancelled", "paused") and external_ref:
                _, uid = _parse_plan_ref(external_ref)
                if not uid:
                    uid = external_ref
                _set_user_plan_mp(uid, "free")
                try:
                    supabase.table("cache").delete().eq("key", f"mp_preapproval:{uid}").execute()
                except Exception:
                    pass
                crear_notificacion(uid, "plan_cancelado", "Suscripción cancelada", "Tu plan ha vuelto a Gratis", "/perfil")

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
        "back_urls": {"success": f"{os.getenv('BASE_URL', 'https://www.traceless.com.ar')}/facturas"},
        "auto_return": "approved",
        "statement_descriptor": "TRACELESS",
    }
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
def precios():
    from app.dolares import get_prices
    return get_prices()
