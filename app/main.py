from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging, os

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s %(message)s",
)
try: logging.getLogger("zeep").setLevel(logging.WARNING)
except: pass
logging.getLogger("httpx").setLevel(logging.WARNING)

load_dotenv()

app = FastAPI(title="TraceLess API")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback, logging
    logger = logging.getLogger("main")
    logger.error(f"Unhandled error: {traceback.format_exc()}")
    from fastapi.responses import JSONResponse
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "https://www.traceless.com.ar,https://traceless.com.ar").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.auth import router as auth_router
from app.clientes import router as clientes_router
from app.facturas import router as facturas_router
from app.db import supabase, get_user_id
from app.lemon import get_user_plan, PLANS, get_whatsapp_count
from app.mercadopago import router as mp_router
from app.retry_queue import router as retry_router
from app.whatsapp_webhook import router as wa_webhook_router
from app.creditos import router as creditos_router
from app.contact import router as contact_router
from app.notifications import router as notifications_router
from app.reembolsos import router as reembolsos_router

app.include_router(auth_router)
app.include_router(clientes_router)
app.include_router(facturas_router)
app.include_router(mp_router)
app.include_router(retry_router)
app.include_router(wa_webhook_router)
app.include_router(creditos_router)
app.include_router(contact_router)
app.include_router(notifications_router)
app.include_router(reembolsos_router)

@app.get("/")
def root():
    return {"name": "TraceLess API", "status": "running"}

@app.get("/api/health")
def health():
    import os
    from app.db import _URL, _ANON_KEY, _SERVICE_KEY
    return {
        "status": "ok",
        "version": "v2-resend",
        "supabase_url": _URL[:30] + "..." if _URL else "MISSING",
        "anon_key_len": len(_ANON_KEY) if _ANON_KEY else 0,
        "service_key_len": len(_SERVICE_KEY) if _SERVICE_KEY else 0,
        "arca_use_real": os.getenv("ARCA_USE_REAL", "MISSING"),
        "arca_env": os.getenv("ARCA_ENV", "MISSING"),
        "arca_cuit": os.getenv("ARCA_CUIT", "MISSING")[:5] + "..." if os.getenv("ARCA_CUIT") else "MISSING",
        "arca_cert_b64_len": len(os.getenv("ARCA_CERT_B64", "")),
        "arca_key_b64_len": len(os.getenv("ARCA_KEY_B64", "")),
    }

@app.get("/api/planes")
def listar_planes(authorization: str = Header("")):
    try:
        uid = get_user_id(authorization)
        plan = get_user_plan(uid)
        return {
            "planes": {k: {**v} for k, v in PLANS.items()},
            "plan_actual": plan["name"],
        }
    except HTTPException:
        return {
            "planes": {k: {**v} for k, v in PLANS.items()},
        }

@app.get("/api/whatsapp/stats")
def whatsapp_stats(authorization: str = Header("")):
    uid = get_user_id(authorization)
    plan = get_user_plan(uid)
    used = get_whatsapp_count(uid)
    limit = plan.get("whatsapp_monthly_limit", 0)
    return {
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used) if limit > 0 else 0,
        "plan": plan["name"],
    }


