import os
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Header
from app.db import supabase, get_user_id
from app.notifications import crear_notificacion

logger = logging.getLogger("referrals")

router = APIRouter(prefix="/api/referrals", tags=["referrals"])


@router.get("/validate/{code}")
def validate_code(code: str):
    """Validar si un código de referido es válido."""
    result = supabase.table("referral_codes").select("*").eq("code", code.upper()).eq("active", True).execute()

    if not result.data:
        raise HTTPException(404, "Código no válido o inactivo")

    ref = result.data[0]

    if ref["used_count"] >= ref["max_uses"]:
        raise HTTPException(400, "Este código ya fue utilizado")

    return {
        "valid": True,
        "code": ref["code"],
        "promo_days": ref["promo_days"],
        "promo_description": f"{ref['promo_days']} días de plan Profesional gratis",
    }


@router.post("/apply")
def apply_code(authorization: str = Header("")):
    """Aplicar código de referido al usuario actual. Da Pro gratis por X días."""
    uid = get_user_id(authorization)

    # Buscar si el usuario ya tiene un código pendiente
    existing = supabase.table("referral_uses").select("*, referral_codes(*)").eq("user_id", uid).execute()

    if existing.data:
        raise HTTPException(400, "Ya tenés un código aplicado")

    # Buscar el código en los metadatos del usuario (se guarda durante registro)
    user = supabase.auth.admin.get_user_by_id(uid)
    meta = user.user.user_metadata or {}
    referral_code = meta.get("referral_code", "")

    if not referral_code:
        raise HTTPException(400, "No tenés ningún código de referido pendiente")

    # Validar el código
    code_result = supabase.table("referral_codes").select("*").eq("code", referral_code.upper()).eq("active", True).execute()

    if not code_result.data:
        raise HTTPException(404, "Código no válido o inactivo")

    ref = code_result.data[0]

    if ref["used_count"] >= ref["max_uses"]:
        raise HTTPException(400, "Este código ya fue utilizado")

    # Calcular expiración
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=ref["promo_days"])

    # Registrar uso
    supabase.table("referral_uses").insert({
        "code_id": ref["id"],
        "user_id": uid,
        "promo_expires_at": expires_at.isoformat(),
    }).execute()

    # Incrementar contador
    supabase.table("referral_codes").update({
        "used_count": ref["used_count"] + 1
    }).eq("id", ref["id"]).execute()

    # Dar plan Pro al usuario
    user_meta = user.user.user_metadata or {}
    user_meta["plan"] = "pro"
    user_meta["referral_promo_expires"] = expires_at.isoformat()
    supabase.auth.admin.update_user_by_id(uid, user_metadata=user_meta)

    # Notificación
    crear_notificacion(uid, "plan_renovado", "¡Plan Profesional activado!",
                       f"Tu código de referido te dio {ref['promo_days']} días de Pro gratis. Disfrútalo!", "/perfil")

    logger.info(f"Referral code {referral_code} applied to user {uid}, expires {expires_at}")

    return {
        "success": True,
        "plan": "pro",
        "expires_at": expires_at.isoformat(),
        "message": f"¡Código aplicado! Tenés {ref['promo_days']} días de plan Profesional gratis.",
    }


@router.get("/stats")
def referral_stats(authorization: str = Header("")):
    """Ver estadísticas de códigos de referido (admin only)."""
    uid = get_user_id(authorization)

    # Verificar admin
    user = supabase.auth.admin.get_user_by_id(uid)
    meta = user.user.user_metadata or {}
    if meta.get("role") != "admin":
        raise HTTPException(403, "Solo administradores")

    # Obtener todos los códigos con sus usos
    codes = supabase.table("referral_codes").select("*, referral_uses(*)").execute()

    stats = []
    for code in codes.data:
        stats.append({
            "code": code["code"],
            "max_uses": code["max_uses"],
            "used_count": code["used_count"],
            "active": code["active"],
            "users": [
                {
                    "user_id": use["user_id"],
                    "used_at": use["used_at"],
                    "promo_expires_at": use["promo_expires_at"],
                }
                for use in code.get("referral_uses", [])
            ],
        })

    return {"codes": stats}
