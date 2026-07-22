from supabase import create_client, Client
from dotenv import load_dotenv
import os, logging

load_dotenv()

_URL = os.getenv("SUPABASE_URL", "")
_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

supabase: Client = create_client(_URL, _SERVICE_KEY)
anon: Client = create_client(_URL, _ANON_KEY)

logger = logging.getLogger("db")

def get_user_id(authorization: str) -> str:
    from fastapi import HTTPException
    import httpx
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Token requerido")
    try:
        r = httpx.get(
            f"{_URL}/auth/v1/user",
            headers={"apikey": _ANON_KEY, "Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if r.status_code != 200 or not r.json().get("id"):
            raise HTTPException(401, "Token inválido o expirado")
        return r.json()["id"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating token: {e}")
        raise HTTPException(401, "Token inválido o expirado")

def admin_insert(table: str, data: dict):
    import httpx
    url = f"{_URL}/rest/v1/{table}"
    headers = {
        "apikey": _SERVICE_KEY,
        "Authorization": f"Bearer {_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    httpx.post(url, headers=headers, json=[data])

