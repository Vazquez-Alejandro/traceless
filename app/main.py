from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TraceLess API")

from app.auth import router as auth_router
from app.clientes import router as clientes_router
from app.facturas import router as facturas_router

app.include_router(auth_router)
app.include_router(clientes_router)
app.include_router(facturas_router)

REACT_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
FACTURAS_DIR = Path(__file__).resolve().parents[1] / "facturas"
FACTURAS_DIR.mkdir(exist_ok=True)

app.mount("/facturas", StaticFiles(directory=str(FACTURAS_DIR)), name="facturas")

_HAS_REACT = REACT_DIST.exists() and (REACT_DIST / "index.html").exists()
if _HAS_REACT:
    app.mount("/assets", StaticFiles(directory=str(REACT_DIST / "assets")), name="react-assets")

    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.middleware.cors import CORSMiddleware

    class SPAFallback(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            response = await call_next(request)
            if response.status_code == 404 and not request.url.path.startswith("/api/"):
                file_path = REACT_DIST / request.url.path.lstrip("/")
                if file_path.is_file():
                    return FileResponse(str(file_path))
                return FileResponse(str(REACT_DIST / "index.html"))
            return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SPAFallback)

@app.get("/")
def root():
    if _HAS_REACT:
        return FileResponse(str(REACT_DIST / "index.html"))
    return {"name": "TraceLess API", "status": "running"}

@app.get("/api/health")
def health():
    return {"status": "ok"}
