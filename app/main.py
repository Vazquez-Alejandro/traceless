from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TraceLess API")

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

app.include_router(auth_router)
app.include_router(clientes_router)
app.include_router(facturas_router)

@app.get("/")
def root():
    return {"name": "TraceLess API", "status": "running"}

@app.get("/api/health")
def health():
    return {"status": "ok"}
