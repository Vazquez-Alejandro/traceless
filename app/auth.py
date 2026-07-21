from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from supabase import Client
from app.db import supabase, admin_insert, _URL, _SERVICE_KEY
import os, logging

logger = logging.getLogger("auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    password: str

def get_user_id(authorization: str = ""):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    return res.user.id

@router.post("/signup")
def signup(req: SignupRequest):
    res = supabase.auth.sign_up({"email": req.email, "password": req.password})
    if res.user:
        try:
            admin_insert("perfiles", {
                "id": res.user.id,
                "email": req.email,
                "nombre": req.name,
            })
        except Exception as e:
            logger.warning(f"Error insertando perfil: {e}")
        from datetime import datetime, timedelta, timezone
        trial_end = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        import httpx
        try:
            r = httpx.put(
                f"{_URL}/auth/v1/admin/users/{res.user.id}",
                headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
                json={"app_metadata": {"plan": "free", "trial_end": trial_end}},
            )
        except Exception as e:
            logger.warning(f"Error seteando plan: {e}")
    return {"user": {"id": res.user.id, "email": req.email} if res.user else None}

@router.post("/login")
def login(req: LoginRequest):
    res = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
    if not res.session:
        raise HTTPException(401, "Credenciales inválidas")
    return {
        "token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "user": {"id": res.user.id, "email": res.user.email},
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    base_url = os.getenv("BASE_URL", "https://www.traceless.com.ar")
    supabase.auth.reset_password_for_email(
        req.email,
        redirect_to=f"{base_url}/reset-password",
    )
    return {"ok": True, "mensaje": "Si el email existe, recibiste un link para restablecer tu contraseña."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, authorization: str = Header("")):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    supabase.auth.update_user(token, {"password": req.password})
    return {"ok": True, "mensaje": "Contraseña actualizada"}

@router.get("/me")
def me(authorization: str = Header("")):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    perfil = supabase.table("perfiles").select("*").eq("id", res.user.id).single().execute()
    from app.lemon import get_user_plan, get_invoice_count, get_whatsapp_count

# Map plan names back to keys
_PLAN_NAME_TO_KEY = {"Gratis": "free", "Profesional": "pro", "Equipo": "team"}
    plan = get_user_plan(res.user.id)
    invoices_used = get_invoice_count(res.user.id)
    whatsapp_used = get_whatsapp_count(res.user.id)
    wp_token = os.getenv("WHATSAPP_TOKEN", "")
    wp_phone = os.getenv("WHATSAPP_PHONE_ID", "")
    whatsapp_ok = bool(wp_token and wp_phone)
    plan_key = _PLAN_NAME_TO_KEY.get(plan["name"], "free")
    return {
        "user": {
            "id": res.user.id, "email": res.user.email,
            "nombre": perfil.data.get("nombre", "") if perfil.data else "",
            "plan": plan["name"],
            "plan_key": plan_key,
            "features": {
                "analytics": plan.get("analytics", False),
                "recurrentes": plan.get("recurrentes", False),
                "multi_user": plan.get("multi_user", False),
                "retry_queue": plan.get("retry_queue", False),
            },
            "whatsapp_configurado": whatsapp_ok,
            "telefono": perfil.data.get("telefono", "") if perfil.data else "",
            "cuit": perfil.data.get("cuit", "") if perfil.data else "",
            "direccion": perfil.data.get("direccion", "") if perfil.data else "",
            "condicion_iva": perfil.data.get("condicion_iva", "Responsable Inscripto") if perfil.data else "Responsable Inscripto",
            "invoices_limit": plan["invoices_per_month"],
            "invoices_used": invoices_used,
            "whatsapp_limit": plan.get("whatsapp_monthly_limit", 0),
            "whatsapp_used": whatsapp_used,
        }
    }

class ProfileUpdate(BaseModel):
    nombre: Optional[str] = None
    cuit: Optional[str] = None
    direccion: Optional[str] = None
    condicion_iva: Optional[str] = None
    telefono: Optional[str] = None

@router.put("/me")
def update_me(req: ProfileUpdate, authorization: str = Header("")):
    uid = get_user_id(authorization)
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    if data:
        supabase.table("perfiles").update(data).eq("id", uid).execute()
    return {"ok": True, "mensaje": "Perfil actualizado"}

@router.put("/me/plan")
def change_plan(authorization: str = Header(""), plan: str = ""):
    if not plan:
        raise HTTPException(400, "Parámetro 'plan' requerido")
    uid = get_user_id(authorization)
    from app.mercadopago import MP_PRICES, MP_TOKEN
    if plan not in MP_PRICES:
        raise HTTPException(400, "Plan no válido")
    res = supabase.auth.get_user(authorization.replace("Bearer ", "").strip())
    email = res.user.email
    import httpx
    body = {
        "items": [{
            "id": plan,
            "title": f"TraceLess Plan {MP_PRICES[plan]['name']}",
            "quantity": 1,
            "unit_price": MP_PRICES[plan]["amount"],
            "currency_id": "ARS",
        }],
        "payer": {"email": email},
        "external_reference": uid,
        "statement_descriptor": "TRACELESS",
    }
    r = httpx.post("https://api.mercadopago.com/checkout/preferences", json=body,
        headers={"Authorization": f"Bearer {MP_TOKEN}", "Content-Type": "application/json"}, timeout=15)
    if r.status_code not in (200, 201):
        raise HTTPException(500, "Error al crear preferencia de pago")
    return {"url": r.json()["init_point"]}
