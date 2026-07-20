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
        "price": 9,
        "price_label": "$9/mes",
        "invoices_per_month": 50,
        "whatsapp": True,
    },
    "pro": {
        "name": "Pro",
        "price": 19,
        "price_label": "$19/mes",
        "invoices_per_month": None,
        "whatsapp": True,
    },
    "pyme": {
        "name": "PyME",
        "price": 29,
        "price_label": "$29/mes",
        "invoices_per_month": None,
        "whatsapp": True,
    },
    "corporate": {
        "name": "Corporativo",
        "price": 99,
        "price_label": "$99/mes",
        "invoices_per_month": None,
        "whatsapp": True,
    },
}

DEFAULT_PLAN = "free"

def _variant_id(plan_key: str) -> Optional[str]:
    return os.getenv(f"LEMON_VARIANT_{plan_key.upper()}") or None

STORE_SLUG = os.getenv("LEMON_STORE_SLUG", "traceless")

def checkout_url(plan_key: str, user_email: str) -> Optional[str]:
    vid = _variant_id(plan_key)
    if not vid:
        return None
    return (
        f"https://{STORE_SLUG}.lemonsqueezy.com/checkout/buy/{vid}"
        f"?checkout[email]={user_email}"
        f"&checkout[custom][user_email]={user_email}"
    )

def _verify_signature(payload: bytes, signature: str) -> bool:
    if not WEBHOOK_SECRET:
        logger.warning("WEBHOOK_SECRET not set, skipping verification")
        return True
    sig = hmac.HMAC(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={sig}", signature)

def _plan_from_variant(variant_id) -> str:
    for key in PLANS:
        if _variant_id(key) == str(variant_id):
            return key
    return DEFAULT_PLAN

def _set_user_plan(email: str, plan_key: str):
    if not email:
        return
    import httpx
    from app.db import _URL, _SERVICE_KEY
    # Get user by email via Auth admin API (bypass list_users pagination)
    r = httpx.get(
        f"{_URL}/auth/v1/admin/users",
        headers={
            "apikey": _SERVICE_KEY,
            "Authorization": f"Bearer {_SERVICE_KEY}",
        },
        params={"filter": email},
    )
    if r.status_code != 200:
        logger.warning(f"Failed to get user by email {email}: {r.status_code}")
        return
    users = r.json().get("users", [])
    if not users:
        logger.warning(f"User not found for email {email}")
        return
    user = users[0]
    uid = user["id"]
    meta = dict(user.get("app_metadata", {}))
    meta["plan"] = plan_key
    httpx.put(
        f"{_URL}/auth/v1/admin/users/{uid}",
        headers={
            "apikey": _SERVICE_KEY,
            "Authorization": f"Bearer {_SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        json={"app_metadata": meta},
    )
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
    import httpx
    from app.db import _URL, _SERVICE_KEY
    try:
        r = httpx.get(
            f"{_URL}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": _SERVICE_KEY,
                "Authorization": f"Bearer {_SERVICE_KEY}",
            },
        )
        if r.status_code == 200:
            meta = r.json().get("app_metadata", {})
            plan_key = meta.get("plan", DEFAULT_PLAN)
            trial_end = meta.get("trial_end")
            if trial_end:
                from datetime import datetime
                end = datetime.fromisoformat(trial_end.replace("Z", "+00:00"))
                if end > datetime.now(timezone.utc):
                    plan_key = "pro"
        else:
            plan_key = DEFAULT_PLAN
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
