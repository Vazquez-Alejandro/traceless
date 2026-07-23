import os, logging, threading
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.db import supabase, get_user_id
from app.lemon import get_user_plan

logger = logging.getLogger("creditos")
router = APIRouter(prefix="/api/creditos", tags=["creditos"])

# Lock per user for credit operations (prevents race conditions)
_user_locks: dict[str, threading.Lock] = {}
_user_locks_lock = threading.Lock()

def _get_user_lock(user_id: str) -> threading.Lock:
    with _user_locks_lock:
        if user_id not in _user_locks:
            _user_locks[user_id] = threading.Lock()
        return _user_locks[user_id]


def get_saldo(user_id: str) -> float:
    """Obtiene el saldo actual de creditos del usuario."""
    res = supabase.table("creditos").select("monto, tipo").eq("user_id", user_id).execute()
    total = 0.0
    for c in (res.data or []):
        if c["tipo"] == "compra":
            total += c["monto"]
        elif c["tipo"] == "consumo":
            total -= c["monto"]
    return max(total, 0)


def descontar_credito(user_id: str, monto: float, descripcion: str = "") -> bool:
    """Descuenta creditos. Retorna True si hay saldo suficiente. Thread-safe."""
    lock = _get_user_lock(user_id)
    with lock:
        saldo = get_saldo(user_id)
        if saldo < monto:
            return False
        supabase.table("creditos").insert({
            "user_id": user_id,
            "monto": monto,
            "tipo": "consumo",
            "descripcion": descripcion,
        }).execute()
        return True


def agregar_credito(user_id: str, monto: float, descripcion: str = "Compra de créditos"):
    """Agrega creditos al usuario."""
    supabase.table("creditos").insert({
        "user_id": user_id,
        "monto": monto,
        "tipo": "compra",
        "descripcion": descripcion,
    }).execute()


def verificar_creditos_bajos(user_id: str):
    """Envía alerta por email si el usuario tiene menos de 10 créditos."""
    from app.lemon import get_whatsapp_count, get_user_plan
    plan = get_user_plan(user_id)
    limit = plan.get("whatsapp_monthly_limit", 0)
    if limit == 0:
        return
    count = get_whatsapp_count(user_id)
    remaining = max(0, limit - count)
    if remaining >= 10:
        return
    perfil = supabase.table("perfiles").select("email, nombre").eq("id", user_id).single().execute()
    if not perfil.data:
        return
    email = perfil.data.get("email", "")
    nombre = perfil.data.get("nombre", "")
    if not email:
        return
    saldo = get_saldo(user_id)
    try:
        import resend
        RESEND_API_KEY = os.getenv("RESEND_API_KEY")
        RESEND_FROM = os.getenv("RESEND_FROM", "TraceLess <noreply@traceless.com.ar>")
        if not RESEND_API_KEY:
            return
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": RESEND_FROM,
            "to": email,
            "subject": f"Te quedan {remaining} mensajes de WhatsApp",
            "html": f"""
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:20px;">
                    <h2 style="color:#1e293b;">Tus créditos se están agotando</h2>
                    <p>Hola {nombre},</p>
                    <p>Te quedan <strong>{remaining} mensajes</strong> de WhatsApp incluidos en tu plan {plan['name']} este mes.</p>
                    <p>Si necesitás enviar más, podés comprar créditos adicionales desde tu perfil.</p>
                    <p style="margin:24px 0;">
                        <a href="https://www.traceless.com.ar/perfil" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Comprar créditos</a>
                    </p>
                    <p style="color:#64748b;font-size:12px;">Saldo actual: ${saldo:,.0f} en créditos</p>
                </div>
            """,
        })
        logger.info(f"Alerta de créditos bajos enviada a {email}: {remaining} restantes")
    except Exception as e:
        logger.error(f"Error enviando alerta de créditos bajos: {e}")


@router.get("")
def consultar_saldo(authorization: str = Header("")):
    uid = get_user_id(authorization)
    saldo = get_saldo(uid)
    plan = get_user_plan(uid)
    return {
        "saldo": saldo,
        "plan": plan["name"],
        "whatsapp_incluido": plan.get("whatsapp_monthly_limit", 0),
        "costo_por_mensaje": plan.get("whatsapp_extra_cost", 0),
    }


class ComprarCredito(BaseModel):
    monto: float = 1000

@router.post("/comprar")
def comprar_credito(req: ComprarCredito, authorization: str = Header("")):
    uid = get_user_id(authorization)
    if req.monto < 500:
        raise HTTPException(400, "Mínimo $500 de crédito")

    perfil = supabase.table("perfiles").select("email").eq("id", uid).single().execute()
    email = perfil.data.get("email", "") if perfil.data else ""

    from app.mercadopago import MP_TOKEN
    import httpx

    body = {
        "items": [{
            "id": "creditos-whatsapp",
            "title": f"Créditos WhatsApp TraceLess - ${req.monto:,.0f}",
            "quantity": 1,
            "unit_price": req.monto,
            "currency_id": "ARS",
        }],
        "payer": {"email": email},
        "external_reference": f"credito_{uid}",
        "statement_descriptor": "TRACELESS",
    }

    r = httpx.post("https://api.mercadopago.com/checkout/preferences", json=body,
        headers={"Authorization": f"Bearer {MP_TOKEN}", "Content-Type": "application/json"}, timeout=15)

    if r.status_code not in (200, 201):
        raise HTTPException(500, "Error al crear preferencia de pago")

    return {"url": r.json()["init_point"], "monto": req.monto}
