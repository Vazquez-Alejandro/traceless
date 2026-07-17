import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except Exception as e:
    import traceback
    _msg = traceback.format_exc()

    from fastapi import FastAPI, Response
    app = FastAPI()

    @app.get("/{path:path}")
    async def catch_all(path: str):
        return Response(
            json.dumps({"import_error": _msg}, indent=2),
            media_type="application/json",
            status_code=500,
        )
