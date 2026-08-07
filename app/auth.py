from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from supabase import Client
from app.db import supabase, admin_insert, _URL, _SERVICE_KEY, _ANON_KEY, get_user_id as _get_user_id
from app.creditos import get_saldo
import os, logging, jwt, time
from datetime import datetime, timedelta, timezone
from collections import defaultdict

logger = logging.getLogger("auth")

def _arca_configurado(p: dict | None) -> bool:
    if not p:
        return False
    # Si la columna arca_validado existe y es True -> conectada de verdad
    if "arca_validado" in p:
        return bool(p.get("arca_validado"))
    # Migración pendiente: fallback al check de datos (aunque no fue validado)
    return bool(p.get("arca_cert") and p.get("arca_key") and p.get("arca_cuit"))

# Rate limiting para login
_login_attempts: dict[str, list[float]] = defaultdict(list)
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 300

# Rate limiting para forgot-password y resend-verification
_forgot_attempts: dict[str, list[float]] = defaultdict(list)
_resend_attempts: dict[str, list[float]] = defaultdict(list)
MAX_EMAIL_ATTEMPTS = 3
EMAIL_LOCKOUT_SECONDS = 300

# Resend config
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM = os.getenv("RESEND_FROM", "TraceLess <noreply@traceless.com.ar>")
VERIFY_SECRET = os.getenv("VERIFY_SECRET") or os.getenv("JWT_SECRET", "")
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
    referral_code: Optional[str] = None

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
    import httpx, re
    from datetime import datetime, timedelta, timezone

    # Validar contraseña
    if len(req.password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")
    if not re.search(r"[A-Z]", req.password):
        raise HTTPException(400, "La contraseña debe contener al menos una mayúscula")
    if not re.search(r"[0-9]", req.password):
        raise HTTPException(400, "La contraseña debe contener al menos un número")

    # Crear usuario via admin API (bypassea rate limit de Supabase)
    r = httpx.post(
        f"{_URL}/auth/v1/admin/users",
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
        json={"email": req.email, "password": req.password, "email_confirm": False},
        timeout=10,
    )
    if r.status_code in (409, 422):
        try:
            err = r.json()
            if err.get("error_code") == "email_exists" or "already" in err.get("msg", "").lower():
                raise HTTPException(409, "Este email ya está registrado. Si ya tenés cuenta, iniciá sesión.")
        except HTTPException:
            raise
        except Exception:
            pass
        raise HTTPException(409, "Este email ya está registrado. Si ya tenés cuenta, iniciá sesión.")
    if r.status_code != 200:
        logger.error(f"Error creando usuario: {r.status_code} {r.text}")
        try:
            err = r.json()
            err_msg = err.get("msg", "")
            if "password" in err_msg.lower():
                raise HTTPException(400, "La contraseña no cumple los requisitos de seguridad.")
        except HTTPException:
            raise
        except Exception:
            pass
        raise HTTPException(500, "Error al crear la cuenta. Intentá de nuevo.")

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
    app_meta = {"plan": "free", "trial_end": trial_end}
    if req.referral_code:
        app_meta["referral_code"] = req.referral_code.upper()
    try:
        httpx.put(
            f"{_URL}/auth/v1/admin/users/{user_id}",
            headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
            json={"app_metadata": app_meta},
            timeout=10,
        )
    except Exception as e:
        logger.warning(f"Error seteando plan: {e}")

    token = create_verify_token(req.email)
    send_verification_email(req.email, token)

    # Notificar por Telegram
    try:
        import httpx
        telegram_url = os.getenv("TELEGRAM_NOTIFIER_URL", "https://telegram-notifier-pmcs.onrender.com")
        resp = httpx.post(
            f"{telegram_url}/notify",
            json={
                "app": "traceless",
                "event": "👤 Nuevo registro",
                "message": f"Email: {req.email}\nNombre: {req.name}",
            },
            timeout=10,
        )
        logger.info(f"Telegram notification sent: {resp.status_code}")
    except Exception as e:
        logger.error(f"Telegram notification error: {e}")

    return {"user": {"email": req.email, "needs_verification": True}}

@router.post("/login")
def login(req: LoginRequest):
    import httpx

    # Rate limiting
    now = time.time()
    email_key = req.email.lower().strip()
    _login_attempts[email_key] = [t for t in _login_attempts[email_key] if now - t < LOCKOUT_SECONDS]
    if len(_login_attempts[email_key]) >= MAX_ATTEMPTS:
        raise HTTPException(429, "Demasiados intentos. Esperá 5 minutos e intentá de nuevo.")

    try:
        r = httpx.post(
            f"{_URL}/auth/v1/token?grant_type=password",
            json={"email": req.email, "password": req.password},
            headers={"apikey": _ANON_KEY, "Content-Type": "application/json"},
            timeout=15,
        )
    except Exception as e:
        logger.error(f"Login connection error: {e}")
        raise HTTPException(502, "No se pudo conectar con el servidor de autenticación")
    if r.status_code != 200:
        _login_attempts[email_key].append(now)
        remaining = MAX_ATTEMPTS - len(_login_attempts[email_key])
        if remaining <= 0:
            raise HTTPException(429, "Demasiados intentos. Esperá 5 minutos e intentá de nuevo.")
        logger.error(f"Login error: {r.status_code} {r.text}")
        # Parse Supabase error for better messages
        try:
            err = r.json()
            err_code = err.get("error_code", "")
            if err_code == "email_not_confirmed":
                raise HTTPException(403, "Tu email no fue verificado. Revisá tu casilla de correo.")
            if err_code == "invalid_grant":
                raise HTTPException(401, "Email o contraseña incorrectos.")
        except HTTPException:
            raise
        except Exception:
            pass
        raise HTTPException(401, "Email o contraseña incorrectos. Verificá los datos e intentá de nuevo.")
    _login_attempts.pop(email_key, None)
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
    now = time.time()
    email_key = req.email.lower().strip()
    _forgot_attempts[email_key] = [t for t in _forgot_attempts[email_key] if now - t < EMAIL_LOCKOUT_SECONDS]
    if len(_forgot_attempts[email_key]) >= MAX_EMAIL_ATTEMPTS:
        raise HTTPException(429, "Demasiados intentos. Esperá 5 minutos e intentá de nuevo.")
    _forgot_attempts[email_key].append(now)
    token = create_reset_token(req.email)
    send_reset_email(req.email, token)
    return {"ok": True, "mensaje": "Si el email existe, recibiste un link para restablecer tu contraseña."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    import re, httpx
    email = verify_reset_token(req.token)
    if not email:
        raise HTTPException(400, "Link inválido o expirado")

    if len(req.password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")
    if not re.search(r"[A-Z]", req.password):
        raise HTTPException(400, "La contraseña debe contener al menos una mayúscula")
    if not re.search(r"[0-9]", req.password):
        raise HTTPException(400, "La contraseña debe contener al menos un número")

    r = httpx.get(
        f"{_URL}/auth/v1/admin/users",
        params={"filter[email]": f"eq.{email}"},
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}"},
        timeout=10,
    )
    if r.status_code != 200 or not r.json().get("users"):
        raise HTTPException(404, "Usuario no encontrado")

    user = r.json()["users"][0]
    uid = user["id"]
    logger.info(f"Reset password: updating user {uid} email={email}")

    # Method 1: Supabase Python client admin API
    try:
        from app.db import supabase as admin_sb
        admin_sb.auth.admin.update_user_by_id(uid, {"password": req.password})
        logger.info("Python client update_user_by_id called")
    except Exception as e:
        logger.warning(f"Python client update failed: {e}")

    # Verify after method 1
    test_r = httpx.post(
        f"{_URL}/auth/v1/token?grant_type=password",
        json={"email": email, "password": req.password},
        headers={"apikey": _ANON_KEY, "Content-Type": "application/json"},
        timeout=10,
    )
    if test_r.status_code == 200:
        return {"ok": True, "mensaje": "Contraseña actualizada"}

    # Method 2: Raw PUT with password
    r2 = httpx.put(
        f"{_URL}/auth/v1/admin/users/{uid}",
        headers={"apikey": _SERVICE_KEY, "Authorization": f"Bearer {_SERVICE_KEY}", "Content-Type": "application/json"},
        json={"password": req.password, "email_confirm": True},
        timeout=10,
    )
    logger.info(f"Reset password: raw PUT status={r2.status_code}")

    # Verify after method 2
    test_r2 = httpx.post(
        f"{_URL}/auth/v1/token?grant_type=password",
        json={"email": email, "password": req.password},
        headers={"apikey": _ANON_KEY, "Content-Type": "application/json"},
        timeout=10,
    )
    if test_r2.status_code == 200:
        return {"ok": True, "mensaje": "Contraseña actualizada"}

    # Method 3: Supabase GoTrue recover endpoint (uses Supabase's own flow)
    # This generates a recovery token that can be used client-side
    logger.info(f"Reset password: admin methods failed, using GoTrue recover")
    r3 = httpx.post(
        f"{_URL}/auth/v1/recover",
        json={"email": email, "redirect_to": f"{BASE_URL}/reset-password-confirm"},
        headers={"apikey": _ANON_KEY, "Content-Type": "application/json"},
        timeout=10,
    )
    logger.info(f"Reset password: recover endpoint status={r3.status_code}")

    # Check if the current password already works (user might be entering the same one)
    if test_r.status_code != 200:
        err = test_r.json() if test_r.status_code >= 400 else {}
        err_code = err.get("error_code", "")
        if err_code == "invalid_grant":
            # Password is wrong but not because of our update - Supabase might have different hashing
            raise HTTPException(400, "No se pudo actualizar con esa contraseña. Intentá con una diferente o pedí un nuevo link de recuperación.")
        raise HTTPException(500, "No se pudo actualizar la contraseña. Pedí un nuevo link de recuperación.")

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
    now = time.time()
    email_key = req.email.lower().strip()
    _resend_attempts[email_key] = [t for t in _resend_attempts[email_key] if now - t < EMAIL_LOCKOUT_SECONDS]
    if len(_resend_attempts[email_key]) >= MAX_EMAIL_ATTEMPTS:
        raise HTTPException(429, "Demasiados intentos. Esperá 5 minutos e intentá de nuevo.")
    _resend_attempts[email_key].append(now)
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
            "arca_configurado": _arca_configurado(perfil_data),
            "arca_cuit": perfil_data.get("arca_cuit", "") if perfil_data else "",
            "arca_env": (perfil_data.get("arca_env", "produccion") if perfil_data else "produccion"),
            "arca_punto_venta": perfil_data.get("arca_punto_venta", 2) if perfil_data else 2,
            "telefono": perfil_data.get("telefono", "") if perfil_data else "",
            "cuit": perfil_data.get("cuit", "") if perfil_data else "",
            "direccion": perfil_data.get("direccion", "") if perfil_data else "",
            "condicion_iva": perfil_data.get("condicion_iva", "Responsable Inscripto") if perfil_data else "Responsable Inscripto",
            "empresa": perfil_data.get("empresa", "") if perfil_data else "",
            "logo_url": perfil_data.get("logo_url", "") if perfil_data else "",
            "email_fiscal": perfil_data.get("email_fiscal", "") if perfil_data else "",
            "condiciones_venta": perfil_data.get("condiciones_venta", "") if perfil_data else "",
             "invoices_limit": plan["invoices_per_month"],
            "invoices_used": invoices_used,
            "whatsapp_limit": plan.get("whatsapp_monthly_limit", 0),
            "whatsapp_used": whatsapp_used,
            "whatsapp_extra_cost": plan.get("whatsapp_extra_cost", 0),
            "creditos": get_saldo(uid),
             "cbu": perfil_data.get("cbu", "") if perfil_data else "",
            "alias_banco": perfil_data.get("alias_banco", "") if perfil_data else "",
            "recordatorios_whatsapp": perfil_data.get("recordatorios_whatsapp", True) if perfil_data else True,
            "recordatorio_monotributo": perfil_data.get("recordatorio_monotributo", True) if perfil_data else True,
            "recordatorio_vencidas": perfil_data.get("recordatorio_vencidas", True) if perfil_data else True,
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
    empresa: Optional[str] = None
    logo_url: Optional[str] = None
    email_fiscal: Optional[str] = None
    condiciones_venta: Optional[str] = None
    recordatorios_whatsapp: Optional[bool] = None
    recordatorio_monotributo: Optional[bool] = None
    recordatorio_vencidas: Optional[bool] = None
    arca_cuit: Optional[str] = None
    arca_cert: Optional[str] = None
    arca_key: Optional[str] = None
    arca_punto_venta: Optional[int] = None
    arca_env: Optional[str] = None

class ArcaConnect(BaseModel):
    arca_cuit: str
    arca_cert: str = ""
    arca_key: str = ""
    arca_punto_venta: int = 2
    arca_env: str = "produccion"

@router.post("/arca/connect")
def arca_connect(req: ArcaConnect, authorization: str = Header("")):
    uid = _get_user_id(authorization)
    import base64
    from app.afip import _login, _resolver_cfg

    cuit = req.arca_cuit.strip().replace(".", "")
    if not cuit or not cuit.isdigit() or len(cuit) != 11:
        raise HTTPException(400, "CUIT inválido. Debe tener 11 dígitos.")

    cert, key = req.arca_cert, req.arca_key

    def _decode(s: str) -> str:
        s = s.strip()
        if s.startswith("arza_b64:"):
            try:
                return base64.b64decode(s.split(":", 1)[1]).decode()
            except Exception:
                raise HTTPException(400, "La cadena del certificado o clave no es base64 válida.")
        if "BEGIN" not in s:
            raise HTTPException(400, "El certificado/clave debe estar en formato PEM (-----BEGIN ...-----).")
        return s

    cert_pem = _decode(cert) if cert else ""
    key_pem = _decode(key) if key else ""

    if not cert_pem or not key_pem:
        raise HTTPException(400, "Debés cargar el certificado (.pem) y la clave privada (.pem) para conectar.")

    try:
        cfg = _resolver_cfg({
            "cuit": cuit,
            "cert": cert_pem,
            "key": key_pem,
            "pto_venta": req.arca_punto_venta,
            "homologacion": req.arca_env != "produccion",
        })
        _login(cfg)
    except Exception as e:
        logger.warning(f"ARCA connect falló para {cuit}: {e}")
        raise HTTPException(400, f"No se pudo validar el certificado con ARCA. {str(e)[:200]}")

    base_data = {
        "arca_cuit": cuit,
        "arca_cert": "arza_b64:" + base64.b64encode(cert_pem.encode()).decode(),
        "arca_key": "arza_b64:" + base64.b64encode(key_pem.encode()).decode(),
        "arca_punto_venta": req.arca_punto_venta,
        "arca_env": req.arca_env,
    }
    try:
        supabase.table("perfiles").update({**base_data, "arca_validado": True}).eq("id", uid).execute()
    except Exception:
        # Columna arca_validado aún no existe: guardar sin ella (migración pendiente)
        try:
            supabase.table("perfiles").update(base_data).eq("id", uid).execute()
        except Exception as e:
            logger.warning(f"Error guardando arca en perfiles para {cuit}: {e}")
            raise HTTPException(500, "El certificado se validó con ARCA, pero falló guardarlo en tu perfil. Contactá a soporte.")

    return {"ok": True, "mensaje": "Facturación fiscal conectada y verificada con ARCA. Ya podés emitir facturas con CAE."}

@router.put("/me")
def update_me(req: ProfileUpdate, authorization: str = Header("")):
    uid = get_user_id(authorization)
    data = {k: v for k, v in req.model_dump().items() if v is not None and v != ""}
    if data:
        supabase.table("perfiles").update(data).eq("id", uid).execute()
    return {"ok": True, "mensaje": "Perfil actualizado"}

@router.put("/me/plan")
def change_plan(authorization: str = Header(""), plan: str = ""):
    if not plan:
        raise HTTPException(400, "Parámetro 'plan' requerido")
    uid = get_user_id(authorization)
    from app.dolares import PRICES_USD, ars_from_usd
    from app.mercadopago import MP_TOKEN
    if plan not in PRICES_USD:
        raise HTTPException(400, "Plan no válido")
    perfil = supabase.table("perfiles").select("email").eq("id", uid).single().execute()
    email = perfil.data.get("email", "") if perfil.data else ""
    import httpx
    body = {
        "items": [{
            "id": plan,
            "title": f"TraceLess Plan {PRICES_USD[plan]['name']}",
            "quantity": 1,
            "unit_price": ars_from_usd(PRICES_USD[plan]["usd"]),
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
