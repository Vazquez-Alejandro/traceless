from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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
def me(token: str = ""):
    if not token:
        raise HTTPException(401, "Token requerido")
    res = supabase.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    perfil = supabase.table("perfiles").select("*").eq("id", res.user.id).single().execute()
    return {"user": {"id": res.user.id, "email": res.user.email, "nombre": perfil.data.get("nombre", "") if perfil.data else ""}}
