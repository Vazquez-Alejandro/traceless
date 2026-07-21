from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from supabase import Client
from app.db import supabase, admin_insert, _URL, _SERVICE_KEY
import os, logging, jwt
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("auth")

# Resend config
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM = os.getenv("RESEND_FROM", "TraceLess <noreply@traceless.com.ar>")
VERIFY_SECRET = os.getenv("VERIFY_SECRET", os.getenv("JWT_SECRET", "change-me"))
BASE_URL = os.getenv("BASE_URL", "https://www.traceless.com.ar")

def create_verify_token(email: str) -> str:
    payload = {"email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "verify"}
    return jwt.encode(payload, VERIFY_SECRET, algorithm="HS256")

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, VERIFY_SECRET, algorithms=["HS256"])
        if payload.get("type") != "verify":
            return None
        return payload.get("email")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def create_reset_token(email: str) -> str:
    payload = {"email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=1), "type": "reset"}
    return jwt.encode(payload, VERIFY_SECRET, algorithm="HS256")

def verify_reset_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, VERIFY_SECRET, algorithms=["HS256"])
        if payload.get("type") != "reset":
            return None
        return payload.get("email")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def send_reset_email(email: str, token: str) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY no configurado, saltando envío de mail")
        return False
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        reset_url = f"{BASE_URL}/reset-password?token={token}"
        resend.Emails.send({
            "from": RESEND_FROM,
            "to": email,
            "subject": "Restablecé tu contraseña en TraceLess",
            "html": f"""
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:20px;">
                    <h2 style="color:#1e293b;">Restablecer contraseña</h2>
                    <p>Hacé clic para elegir una nueva contraseña:</p>
                    <p style="margin:24px 0;">
                        <a href="{reset_url}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Restablecer contraseña</a>
                    </p>
                    <p style="color:#64748b;font-size:14px;">O copiá este link:<br><a href="{reset_url}">{reset_url}</a></p>
                    <p style="color:#64748b;font-size:12px;">Expira en 1 hora. Si no pediste esto, ignorá este mail.</p>
                </div>
            """
        })
        return True
    except Exception as e:
        logger.error(f"Error enviando mail reset: {e}")
        return False

def send_verification_email(email: str, token: str) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY no configurado, saltando envío de mail")
        return False
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        verify_url = f"{BASE_URL}/verify-email?token={token}"
        resend.Emails.send({
            "from": RESEND_FROM,
            "to": email,
            "subject": "Verificá tu cuenta en TraceLess",
            "html": f"""
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:20px;">
                    <h2 style="color:#1e293b;">Bienvenido a TraceLess</h2>
                    <p>Hacé clic para activar tu cuenta:</p>
                    <p style="margin:24px 0;">
                        <a href="{verify_url}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Verificar cuenta</a>
                    </p>
                    <p style="color:#64748b;font-size:14px;">O copiá este link:<br><a href="{verify_url}">{verify_url}</a></p>
                    <p style="color:#64748b;font-size:12px;">Expira en 24 horas. Si no te registraste, ignorá este mail.</p>
                </div>
            """
        })
        return True
    except Exception as e:
        logger.error(f"Error enviando mail verificación: {e}")
        return False

# Map plan names back to keys
_PLAN_NAME_TO_KEY = {"Gratis": "free", "Profesional": "pro", "Equipo": "team"}

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
    token: str
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
    try:
        res = supabase.auth.sign_up({"email": req.email, "password": req.password})
    except Exception as e:
        err = str(e)
        if "rate limit" in err.lower() or "429" in err:
            raise HTTPException(429, "Demasiados registros. Esperá un momento.")
        if "already registered" in err.lower() or "already exists" in err.lower():
            raise HTTPException(409, "Este email ya está registrado. Iniciá sesión.")
        logger.error(f"Error en signup: {e}")
        raise HTTPException(500, "Error al crear la cuenta")

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

    # Crear token y enviar mail de verificación
    token = create_verify_token(req.email)
    send_verification_email(req.email, token)

    return {"user": {"email": req.email, "needs_verification": True}}

@router.post("/login")
def login(req: LoginRequest):
    res = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
    if not res.session:
        raise HTTPException(401, "Credenciales inválidas")
    if res.user and res.user.email_confirmed_at is None:
        raise HTTPException(403, "Tu email no fue verificado. Revisá tu casilla de correo.")
    return {
        "token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "user": {"id": res.user.id, "email": res.user.email},
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    token = create_reset_token(req.email)
    send_reset_email(req.email, token)
    return {"ok": True, "mensaje": "Si el email existe, recibiste un link para restablecer tu contraseña."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    email = verify_reset_token(req.token)
    if not email:
        raise HTTPException(400, "Link inválido o expirado")

    import httpx
    r = httpx.get(
        f"{_URL}/auth/v1/admin/users",
        params={"filter[email]": f"eq.{email}"},
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"},
        timeout=10,
    )
    if r.status_code != 200 or not r.json().get("users"):
        raise HTTPException(404, "Usuario no encontrado")

    user = r.json()["users"][0]
    r2 = httpx.put(
        f"{_URL}/auth/v1/admin/users/{user['id']}",
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
        json={"password": req.password},
        timeout=10,
    )
    if r2.status_code != 200:
        raise HTTPException(500, "Error al actualizar la contraseña")

    return {"ok": True, "mensaje": "Contraseña actualizada"}

class VerifyRequest(BaseModel):
    token: str

@router.post("/verify-email")
def verify_email(req: VerifyRequest):
    email = verify_token(req.token)
    if not email:
        raise HTTPException(400, "Link inválido o expirado")

    # Buscar usuario en Supabase admin API
    import httpx
    r = httpx.get(
        f"{_URL}/auth/v1/admin/users",
        params={"filter[email]": f"eq.{email}"},
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"},
        timeout=10,
    )
    if r.status_code != 200 or not r.json().get("users"):
        raise HTTPException(404, "Usuario no encontrado")

    user = r.json()["users"][0]
    if user.get("email_confirmed_at"):
        return {"ok": True, "mensaje": "Email ya estaba verificado"}

    now = datetime.now(timezone.utc).isoformat()
    r2 = httpx.put(
        f"{_URL}/auth/v1/admin/users/{user['id']}",
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
        json={"email_confirmed_at": now},
        timeout=10,
    )
    if r2.status_code != 200:
        raise HTTPException(500, "Error al confirmar el email")

    return {"ok": True, "mensaje": "Email verificado correctamente"}

@router.get("/me")
def me(authorization: str = Header("")):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    perfil = supabase.table("perfiles").select("*").eq("id", res.user.id).execute()
    perfil_data = perfil.data[0] if perfil.data else None
    if not perfil_data:
        try:
            admin_insert("perfiles", {
                "id": res.user.id,
                "email": res.user.email or "",
                "nombre": "",
            })
            perfil_data = {"id": res.user.id, "email": res.user.email, "nombre": ""}
        except Exception as e:
            logger.warning(f"Error creando perfil en me(): {e}")
    from app.lemon import get_user_plan, get_invoice_count, get_whatsapp_count
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
            "nombre": perfil_data.get("nombre", "") if perfil_data else "",
            "plan": plan["name"],
            "plan_key": plan_key,
            "features": {
                "analytics": plan.get("analytics", False),
                "recurrentes": plan.get("recurrentes", False),
                "multi_user": plan.get("multi_user", False),
                "retry_queue": plan.get("retry_queue", False),
            },
            "whatsapp_configurado": whatsapp_ok,
            "telefono": perfil_data.get("telefono", "") if perfil_data else "",
            "cuit": perfil_data.get("cuit", "") if perfil_data else "",
            "direccion": perfil_data.get("direccion", "") if perfil_data else "",
            "condicion_iva": perfil_data.get("condicion_iva", "Responsable Inscripto") if perfil_data else "Responsable Inscripto",
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
