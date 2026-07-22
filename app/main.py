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
    from starlette.responses import Response
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.auth import router as auth_router
from app.clientes import router as clientes_router
from app.facturas import router as facturas_router
from app.db import supabase, get_user_id
from app.lemon import handle_webhook, get_user_plan, PLANS, get_whatsapp_count
from app.mercadopago import router as mp_router
from app.retry_queue import router as retry_router
from app.whatsapp_webhook import router as wa_webhook_router
from app.creditos import router as creditos_router
from app.contact import router as contact_router

app.include_router(auth_router)
app.include_router(clientes_router)
app.include_router(facturas_router)
app.include_router(mp_router)
app.include_router(retry_router)
app.include_router(wa_webhook_router)
app.include_router(creditos_router)
app.include_router(contact_router)

@app.get("/")
def root():
    return {"name": "TraceLess API", "status": "running"}

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "v2-resend"}

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

@app.post("/api/lemon/webhook")
async def lemon_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("x-signature", "")
    result = handle_webhook(body, signature)
    if not result["ok"]:
        raise HTTPException(400, result["error"])
    return result
