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
