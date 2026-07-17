from fastapi import FastAPI
try:
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app.main import app
except Exception as e:
    import traceback
    _err = traceback.format_exc()

    _fastapi_app = FastAPI()

    @_fastapi_app.get("/{path:path}")
    async def catch_all(path: str):
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "import failed", "detail": _err}, status_code=500)

    app = _fastapi_app
