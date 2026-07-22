from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from supabase import Client
from app.db import supabase, admin_insert, _URL, _SERVICE_KEY, _ANON_KEY, get_user_id as _get_user_id
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

def get_user_id(authorization: str = "") -> str:
    return _get_user_id(authorization)

@router.post("/signup")
def signup(req: SignupRequest):
    import httpx
    from datetime import datetime, timedelta, timezone

    # Crear usuario via admin API (bypassea rate limit de Supabase)
    r = httpx.post(
        f"{_URL}/auth/v1/admin/users",
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
        json={"email": req.email, "password": req.password, "email_confirm": False},
        timeout=10,
    )
    if r.status_code == 409:
        raise HTTPException(409, "Este email ya está registrado. Iniciá sesión.")
    if r.status_code != 200:
        logger.error(f"Error creando usuario: {r.status_code} {r.text}")
        raise HTTPException(500, "Error al crear la cuenta")

    user = r.json()
    user_id = user["id"]

    try:
        admin_insert("perfiles", {
            "id": user_id,
            "email": req.email,
            "nombre": req.name,
        })
    except Exception as e:
        logger.warning(f"Error insertando perfil: {e}")

    trial_end = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    try:
        httpx.put(
            f"{_URL}/auth/v1/admin/users/{user_id}",
            headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
            json={"app_metadata": {"plan": "free", "trial_end": trial_end}},
            timeout=10,
        )
    except Exception as e:
        logger.warning(f"Error seteando plan: {e}")

    token = create_verify_token(req.email)
    send_verification_email(req.email, token)

    return {"user": {"email": req.email, "needs_verification": True}}

@router.post("/login")
def login(req: LoginRequest):
    import httpx
    try:
        r = httpx.post(
            f"{_URL}/auth/v1/token?grant_type=password",
            json={"email": req.email, "password": req.password},
            headers={"apikey": _SERVICE_KEY, "Content-Type": "application/json"},
            timeout=15,
        )
    except Exception as e:
        logger.error(f"Login connection error: {e}")
        raise HTTPException(502, "No se pudo conectar con el servidor de autenticación")
    if r.status_code != 200:
        logger.error(f"Login error: {r.status_code} {r.text}")
        raise HTTPException(401, "Credenciales inválidas")
    data = r.json()
    if not data.get("user", {}).get("email_confirmed_at"):
        raise HTTPException(403, "Tu email no fue verificado. Revisá tu casilla de correo.")
    return {
        "token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "user": {"id": data["user"]["id"], "email": data["user"]["email"]},
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
        json={"email_confirm": True},
        timeout=10,
    )
    if r2.status_code != 200:
        raise HTTPException(500, "Error al confirmar el email")

    return {"ok": True, "mensaje": "Email verificado correctamente"}

@router.post("/resend-verification")
def resend_verification(req: ForgotPasswordRequest):
    email = req.email
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
        return {"ok": True, "mensaje": "Email ya está verificado. Podés iniciar sesión."}
    token = create_verify_token(email)
    sent = send_verification_email(email, token)
    if not sent:
        raise HTTPException(500, "Error al enviar el email de verificación")
    return {"ok": True, "mensaje": "Email de verificación reenviado. Revisá tu casilla."}

@router.post("/confirm-email")
def confirm_email_direct(req: ForgotPasswordRequest):
    import httpx
    r = httpx.get(
        f"{_URL}/auth/v1/admin/users",
        params={"filter[email]": f"eq.{req.email}"},
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"},
        timeout=10,
    )
    if r.status_code != 200 or not r.json().get("users"):
        raise HTTPException(404, "Usuario no encontrado")
    user = r.json()["users"][0]
    if user.get("email_confirmed_at"):
        return {"ok": True, "mensaje": "Email ya está confirmado"}
    r2 = httpx.put(
        f"{_URL}/auth/v1/admin/users/{user['id']}",
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
        json={"email_confirm": True},
        timeout=10,
    )
    if r2.status_code != 200:
        raise HTTPException(500, "Error al confirmar el email")
    return {"ok": True, "mensaje": "Email confirmado correctamente. Ya podés iniciar sesión."}

@router.get("/me")
def me(authorization: str = Header("")):
    uid = _get_user_id(authorization)
    perfil = supabase.table("perfiles").select("*").eq("id", uid).execute()
    perfil_data = perfil.data[0] if perfil.data else None
    email = perfil_data.get("email", "") if perfil_data else ""
    if not perfil_data:
        try:
            admin_insert("perfiles", {"id": uid, "email": email, "nombre": ""})
            perfil_data = {"id": uid, "email": email, "nombre": ""}
        except Exception as e:
            logger.warning(f"Error creando perfil en me(): {e}")
    from app.lemon import get_user_plan, get_invoice_count, get_whatsapp_count
    plan = get_user_plan(uid)
    invoices_used = get_invoice_count(uid)
    whatsapp_used = get_whatsapp_count(uid)
    wp_token = os.getenv("WHATSAPP_TOKEN", "")
    wp_phone = os.getenv("WHATSAPP_PHONE_ID", "")
    whatsapp_ok = bool(wp_token and wp_phone)
    plan_key = _PLAN_NAME_TO_KEY.get(plan["name"], "free")
    return {
        "user": {
            "id": uid, "email": email,
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
            "whatsapp_extra_cost": plan.get("whatsapp_extra_cost", 0),
        }
    }

class ProfileUpdate(BaseModel):
    nombre: Optional[str] = None
    cuit: Optional[str] = None
    direccion: Optional[str] = None
    condicion_iva: Optional[str] = None
    telefono: Optional[str] = None
    cbu: Optional[str] = None
    alias_banco: Optional[str] = None

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
    perfil = supabase.table("perfiles").select("email").eq("id", uid).single().execute()
    email = perfil.data.get("email", "") if perfil.data else ""
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
