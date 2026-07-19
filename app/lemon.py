import os, json, logging, hashlib, hmac
from datetime import datetime, timezone
from typing import Optional
from app.db import supabase

logger = logging.getLogger("lemon")

LEMON_API = "https://api.lemonsqueezy.com/v1"
API_KEY = os.getenv("LEMON_SQUEEZY_API_KEY", "")
STORE_ID = os.getenv("LEMON_SQUEEZY_STORE_ID", "")
WEBHOOK_SECRET = os.getenv("LEMON_SQUEEZY_WEBHOOK_SECRET", "")

PLANS = {
    "free": {
        "name": "Gratis",
        "price": 0,
        "price_label": "Gratis",
        "invoices_per_month": 3,
        "whatsapp": False,
    },
    "basic": {
        "name": "Básico",
        "price": 5,
        "price_label": "$5/mes",
        "invoices_per_month": 50,
        "whatsapp": True,
    },
    "pro": {
        "name": "Pro",
        "price": 12,
        "price_label": "$12/mes",
        "invoices_per_month": None,
        "whatsapp": True,
    },
    "pyme": {
        "name": "PyME",
        "price": 15,
        "price_label": "$15/mes",
        "invoices_per_month": None,
        "whatsapp": True,
    },
    "corporate": {
        "name": "Corporativo",
        "price": 75,
        "price_label": "$75/mes",
        "invoices_per_month": None,
        "whatsapp": True,
    },
}

DEFAULT_PLAN = "free"

def _variant_id(plan_key: str) -> Optional[str]:
    return os.getenv(f"LEMON_VARIANT_{plan_key.upper()}") or None

def checkout_url(plan_key: str, user_email: str) -> Optional[str]:
    vid = _variant_id(plan_key)
    if not vid:
        return None
    return (
        f"https://app.lemonsqueezy.com/checkout/buy/{vid}"
        f"?checkout[email]={user_email}"
        f"&checkout[custom][user_email]={user_email}"
    )

def _verify_signature(payload: bytes, signature: str) -> bool:
    if not WEBHOOK_SECRET:
        logger.warning("WEBHOOK_SECRET not set, skipping verification")
        return True
    sig = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={sig}", signature)

def _plan_from_variant(variant_id) -> str:
    for key in PLANS:
        if _variant_id(key) == str(variant_id):
            return key
    return DEFAULT_PLAN

def _set_user_plan(email: str, plan_key: str):
    if not email:
        return
    res = supabase.auth.admin.get_user_by_email(email)
    if res.user is None:
        logger.warning(f"User not found for email {email}")
        return
    supabase.auth.admin.update_user_by_id(res.user.id, {
        "app_metadata": {**res.user.app_metadata, "plan": plan_key},
    })
    logger.info(f"Plan {plan_key} set for {email}")

def handle_webhook(payload: bytes, signature: str) -> dict:
    if not _verify_signature(payload, signature):
        return {"ok": False, "error": "Invalid signature"}
    data = json.loads(payload)
    meta = data.get("meta", {})
    event_name = meta.get("event_name", "")
    custom_data = meta.get("custom_data", {}) or {}
    user_email = custom_data.get("user_email", "")

    if event_name == "order_created":
        attrs = data.get("data", {}).get("attributes", {})
        user_email = user_email or attrs.get("user_email", "")
        first_sub = attrs.get("first_subscription", {}) or {}
        vid = first_sub.get("variant_id", "") or attrs.get("variant_id", "")
        plan_key = _plan_from_variant(vid)
        _set_user_plan(user_email, plan_key)
        return {"ok": True, "event": event_name, "plan": plan_key}

    if event_name in ("subscription_updated", "subscription_cancelled"):
        attrs = data.get("data", {}).get("attributes", {})
        status = attrs.get("status", "")
        if status in ("cancelled", "expired", "unpaid"):
            _set_user_plan(user_email, DEFAULT_PLAN)
            return {"ok": True, "event": event_name, "plan": DEFAULT_PLAN}
        plan_key = _plan_from_variant(attrs.get("variant_id", ""))
        _set_user_plan(user_email, plan_key)
        return {"ok": True, "event": event_name, "plan": plan_key}

    return {"ok": True, "event": event_name}

def get_user_plan(user_id: str) -> dict:
    try:
        res = supabase.auth.admin.get_user_by_id(user_id)
        plan_key = res.user.app_metadata.get("plan", DEFAULT_PLAN)
    except Exception:
        plan_key = DEFAULT_PLAN
    return PLANS.get(plan_key, PLANS[DEFAULT_PLAN])

def get_invoice_count(user_id: str) -> int:
    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    res = supabase.table("facturas").select("id", count="exact").eq("user_id", user_id).gte("created_at", start).execute()
    return res.count or 0

def can_create_invoice(user_id: str) -> tuple[bool, str]:
    plan = get_user_plan(user_id)
    limit = plan["invoices_per_month"]
    if limit is None:
        return True, ""
    count = get_invoice_count(user_id)
    if count >= limit:
        return False, f"Límite de {limit} facturas/mes alcanzado. Actualizá tu plan."
    return True, ""
