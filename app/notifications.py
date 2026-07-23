from fastapi import APIRouter, HTTPException, Request
from supabase import create_client
import os

router = APIRouter(prefix="/api/notificaciones")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")
    import httpx
    r = httpx.get(f"{SUPABASE_URL}/auth/v1/user", headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_KEY})
    if r.status_code != 200:
        raise HTTPException(401, "Token inválido")
    return r.json()["id"]


def crear_notificacion(user_id: str, tipo: str, titulo: str, mensaje: str = "", enlace: str = ""):
    try:
        supabase.table("notificaciones").insert({
            "user_id": user_id,
            "tipo": tipo,
            "titulo": titulo,
            "mensaje": mensaje,
            "enlace": enlace,
        }).execute()
    except Exception:
        pass


@router.get("")
def listar(request: Request, limit: int = 50, offset: int = 0):
    user_id = _get_user_id(request)
    total = supabase.table("notificaciones").select("id", count="exact").eq("user_id", user_id).execute()
    items = supabase.table("notificaciones").select("*").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"notificaciones": items.data, "total": total.count}


@router.get("/count")
def count_no_leidas(request: Request):
    user_id = _get_user_id(request)
    r = supabase.table("notificaciones").select("id", count="exact").eq("user_id", user_id).eq("leida", False).execute()
    return {"count": r.count}


@router.put("/{notif_id}/read")
def marcar_leida(notif_id: str, request: Request):
    user_id = _get_user_id(request)
    supabase.table("notificaciones").update({"leida": True}).eq("id", notif_id).eq("user_id", user_id).execute()
    return {"ok": True}


@router.put("/read-all")
def marcar_todas_leidas(request: Request):
    user_id = _get_user_id(request)
    supabase.table("notificaciones").update({"leida": True}).eq("user_id", user_id).eq("leida", False).execute()
    return {"ok": True}


@router.delete("/{notif_id}")
def eliminar(notif_id: str, request: Request):
    user_id = _get_user_id(request)
    supabase.table("notificaciones").delete().eq("id", notif_id).eq("user_id", user_id).execute()
    return {"ok": True}
