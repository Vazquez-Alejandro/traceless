import os
from datetime import datetime, timezone
from typing import Optional
from app.db import supabase

DEFAULT_PLAN = "free"
ADMIN_EMAILS = set(filter(None, os.getenv("ADMIN_EMAILS", "vazquezale82@gmail.com").split(",")))

PLANS = {
    "free": {
        "name": "Gratis",
        "price": 0,
        "price_label": "Gratis",
        "invoices_per_month": 5,
        "whatsapp": False,
        "whatsapp_monthly_limit": 0,
        "whatsapp_extra_cost": 0,
        "analytics": False,
        "recurrentes": False,
        "multi_user": False,
        "retry_queue": False,
    },
    "pro": {
        "name": "Profesional",
        "price": 15000,
        "price_label": "$15.000/mes",
        "invoices_per_month": None,
        "whatsapp": True,
        "whatsapp_monthly_limit": 100,
        "whatsapp_extra_cost": 70,
        "analytics": True,
        "recurrentes": True,
        "multi_user": False,
        "retry_queue": True,
    },
    "team": {
        "name": "Equipo",
        "price": 29000,
        "price_label": "$29.000/mes",
        "invoices_per_month": None,
        "whatsapp": True,
        "whatsapp_monthly_limit": 250,
        "whatsapp_extra_cost": 60,
        "analytics": True,
        "recurrentes": True,
        "multi_user": True,
        "retry_queue": True,
    },
}

_plan_cache: dict[str, tuple[dict, float]] = {}
PLAN_CACHE_TTL = 300  # 5 minutos

def get_user_plan(user_id: str) -> dict:
    now = datetime.now(timezone.utc).timestamp()
    if user_id in _plan_cache:
        cached_plan, cached_time = _plan_cache[user_id]
        if now - cached_time < PLAN_CACHE_TTL:
            return cached_plan
    try:
        from app.db import _URL, _SERVICE_KEY
        import httpx
        r = httpx.get(
            f"{_URL}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": _SERVICE_KEY,
                "Authorization": f"Bearer {_SERVICE_KEY}",
            },
        )
        if r.status_code == 200:
            user_data = r.json()
            meta = user_data.get("app_metadata", {})
            plan_key = meta.get("plan", DEFAULT_PLAN)
            email = user_data.get("email", "")
            if email in ADMIN_EMAILS:
                plan = PLANS["team"]
                _plan_cache[user_id] = (plan, now)
                return plan
            trial_end = meta.get("trial_end")
            if trial_end:
                end = datetime.fromisoformat(trial_end.replace("Z", "+00:00"))
                if end > datetime.now(timezone.utc):
                    plan_key = "pro"
        else:
            plan_key = DEFAULT_PLAN
    except Exception:
        plan_key = DEFAULT_PLAN
    plan = PLANS.get(plan_key, PLANS[DEFAULT_PLAN])
    _plan_cache[user_id] = (plan, now)
    return plan

def invalidate_plan_cache(user_id: str):
    _plan_cache.pop(user_id, None)

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

def get_whatsapp_count(user_id: str) -> int:
    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    res = supabase.table("whatsapp_log").select("id", count="exact").eq("user_id", user_id).gte("created_at", start).execute()
    return res.count or 0

def can_send_whatsapp(user_id: str) -> tuple[bool, str]:
    plan = get_user_plan(user_id)
    limit = plan.get("whatsapp_monthly_limit", 0)
    if limit == 0:
        return False, "Tu plan no incluye envío por WhatsApp. Actualizá para enviar facturas al instante."
    count = get_whatsapp_count(user_id)
    if count >= limit:
        from app.creditos import get_saldo
        costo_msg = plan.get("whatsapp_extra_cost", 70)
        saldo = get_saldo(user_id)
        if saldo < costo_msg:
            return False, f"Sin créditos para mensajes extra. Necesitás ${costo_msg} por mensaje. Comprá créditos."
        return True, ""
    return True, ""

def get_whatsapp_extra_cost(user_id: str) -> int:
    plan = get_user_plan(user_id)
    limit = plan.get("whatsapp_monthly_limit", 0)
    if limit == 0:
        return 0
    count = get_whatsapp_count(user_id)
    if count <= limit:
        return 0
    extra = count - limit
    return plan.get("whatsapp_extra_cost", 70) * extra

def has_feature(user_id: str, feature: str) -> bool:
    plan = get_user_plan(user_id)
    return plan.get(feature, False)

def log_whatsapp_send(user_id: str, factura_id: str = "", tipo: str = "factura"):
    supabase.table("whatsapp_log").insert({
        "user_id": user_id,
        "factura_id": factura_id,
        "tipo": tipo,
    }).execute()

def _set_user_plan(email: str, plan_key: str):
    if not email:
        return
    import httpx
    from app.db import _URL, _SERVICE_KEY
    r = httpx.get(
        f"{_URL}/auth/v1/admin/users",
        headers={
            "apikey": _SERVICE_KEY,
            "Authorization": f"Bearer {_SERVICE_KEY}",
        },
        params={"filter": email},
    )
    if r.status_code != 200:
        return
    users = r.json().get("users", [])
    if not users:
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
    from app.notifications import crear_notificacion
    plan_names = {"free": "Gratis", "pro": "Profesional", "team": "Equipo"}
    crear_notificacion(uid, "plan_renovado", f"Plan {plan_names.get(plan_key, plan_key)} activado", "Tu plan ha sido actualizado", "/perfil")

def get_user_plan(user_id: str) -> dict:
    import httpx
    from app.db import _URL, _SERVICE_KEY
    import time

    # Check cache first
    now = time.time()
    if user_id in _plan_cache:
        cached_plan, cached_time = _plan_cache[user_id]
        if now - cached_time < PLAN_CACHE_TTL:
            return cached_plan

    try:
        r = httpx.get(
            f"{_URL}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": _SERVICE_KEY,
                "Authorization": f"Bearer {_SERVICE_KEY}",
            },
        )
        if r.status_code == 200:
            user_data = r.json()
            meta = user_data.get("app_metadata", {})
            plan_key = meta.get("plan", DEFAULT_PLAN)
            email = user_data.get("email", "")
            if email in ADMIN_EMAILS:
                plan = PLANS["team"]
                _plan_cache[user_id] = (plan, now)
                return plan
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
    plan = PLANS.get(plan_key, PLANS[DEFAULT_PLAN])
    _plan_cache[user_id] = (plan, now)
    return plan


def invalidate_plan_cache(user_id: str):
    _plan_cache.pop(user_id, None)

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

def get_whatsapp_count(user_id: str) -> int:
    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    res = supabase.table("whatsapp_log").select("id", count="exact").eq("user_id", user_id).gte("created_at", start).execute()
    return res.count or 0

def can_send_whatsapp(user_id: str) -> tuple[bool, str]:
    plan = get_user_plan(user_id)
    limit = plan.get("whatsapp_monthly_limit", 0)
    if limit == 0:
        return False, "Tu plan no incluye envío por WhatsApp. Actualizá para enviar facturas al instante."
    count = get_whatsapp_count(user_id)
    if count >= limit:
        from app.creditos import get_saldo
        costo_msg = plan.get("whatsapp_extra_cost", 70)
        saldo = get_saldo(user_id)
        if saldo < costo_msg:
            return False, f"Sin créditos para mensajes extra. Necesitás ${costo_msg} por mensaje. Comprá créditos."
        return True, ""
    return True, ""

def get_whatsapp_extra_cost(user_id: str) -> int:
    plan = get_user_plan(user_id)
    limit = plan.get("whatsapp_monthly_limit", 0)
    if limit == 0:
        return 0
    count = get_whatsapp_count(user_id)
    if count <= limit:
        return 0
    extra = count - limit
    return plan.get("whatsapp_extra_cost", 70) * extra

def has_feature(user_id: str, feature: str) -> bool:
    plan = get_user_plan(user_id)
    return plan.get(feature, False)

def log_whatsapp_send(user_id: str, factura_id: str = "", tipo: str = "factura"):
    supabase.table("whatsapp_log").insert({
        "user_id": user_id,
        "factura_id": factura_id,
        "tipo": tipo,
    }).execute()
