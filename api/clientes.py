from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from .db import supabase

router = APIRouter(prefix="/api/clientes", tags=["clientes"])

class ClienteCreate(BaseModel):
    nombre: str
    apellido: str
    email: Optional[str] = ""
    telefono: Optional[str] = ""
    cuit: Optional[str] = ""
    direccion: Optional[str] = ""
    condicion_iva: str = "Responsable Inscripto"

def get_user_id(authorization: str = Header("")) -> str:
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    return res.user.id

@router.get("")
def listar_clientes(authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("clientes").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    return {"clientes": res.data}

@router.post("")
def crear_cliente(req: ClienteCreate, authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("clientes").insert({
        "user_id": uid,
        "nombre": req.nombre,
        "apellido": req.apellido,
        "email": req.email,
        "telefono": req.telefono,
        "cuit": req.cuit,
        "direccion": req.direccion,
        "condicion_iva": req.condicion_iva,
    }).execute()
    return {"cliente": res.data[0]}

@router.put("/{cliente_id}")
def actualizar_cliente(cliente_id: str, req: ClienteCreate, authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.table("clientes").update(req.model_dump()).eq("id", cliente_id).eq("user_id", uid).execute()
    if not res.data:
        raise HTTPException(404, "Cliente no encontrado")
    return {"cliente": res.data[0]}

@router.delete("/{cliente_id}")
def eliminar_cliente(cliente_id: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    supabase.table("clientes").delete().eq("id", cliente_id).eq("user_id", uid).execute()
    return {"ok": True}
