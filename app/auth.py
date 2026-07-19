from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from supabase import Client
from app.db import supabase, admin_insert
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
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
        admin_insert("perfiles", {
            "id": res.user.id,
            "email": req.email,
            "nombre": req.name,
        })
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

@router.get("/me")
def me(authorization: str = Header("")):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    perfil = supabase.table("perfiles").select("*").eq("id", res.user.id).single().execute()
    from app.lemon import get_user_plan
    plan = get_user_plan(res.user.id)
    return {"user": {"id": res.user.id, "email": res.user.email, "nombre": perfil.data.get("nombre", "") if perfil.data else "", "plan": plan["name"]}}

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
    from app.lemon import checkout_url
    res = supabase.auth.get_user(authorization.replace("Bearer ", "").strip())
    email = res.user.email
    url = checkout_url(plan, email)
    if not url:
        raise HTTPException(400, "Plan no disponible")
    return {"url": url}
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    perfil = supabase.table("perfiles").select("*").eq("id", res.user.id).single().execute()
    return {"user": {"id": res.user.id, "email": res.user.email, "nombre": perfil.data.get("nombre", "") if perfil.data else ""}}
