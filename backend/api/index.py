import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except Exception:
    import traceback
    _err = traceback.format_exc()

    from fastapi import FastAPI, Response
    app = FastAPI()

    @app.get("/{path:path}")
    async def catch_all(path: str):
        return Response(
            json.dumps({"import_error": _err, "path": path}, indent=2),
            media_type="application/json",
            status_code=500,
        )
