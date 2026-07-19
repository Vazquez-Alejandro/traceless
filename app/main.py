from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s %(message)s",
)
logging.getLogger("zeep").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

load_dotenv()

app = FastAPI(title="TraceLess API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.auth import router as auth_router, get_user_id
from app.clientes import router as clientes_router
from app.facturas import router as facturas_router
from app.db import supabase
from app.lemon import handle_webhook, checkout_url, get_user_plan, PLANS

app.include_router(auth_router)
app.include_router(clientes_router)
app.include_router(facturas_router)

@app.get("/")
def root():
    return {"name": "TraceLess API", "status": "running"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

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

@app.get("/api/checkout/{plan_key}")
def get_checkout(plan_key: str, authorization: str = Header("")):
    uid = get_user_id(authorization)
    res = supabase.auth.admin.get_user_by_id(uid)
    email = res.user.email
    url = checkout_url(plan_key, email)
    if not url:
        raise HTTPException(400, "Plan no disponible o no configurado")
    return {"url": url}

@app.post("/api/lemon/webhook")
async def lemon_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("x-signature", "")
    result = handle_webhook(body, signature)
    if not result["ok"]:
        raise HTTPException(400, result["error"])
    return result
