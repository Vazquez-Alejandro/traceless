from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

_URL = os.getenv("SUPABASE_URL", "")
_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

supabase: Client = create_client(_URL, _SERVICE_KEY)
anon: Client = create_client(_URL, _ANON_KEY)

def admin_insert(table: str, data: dict):
    import httpx
    url = f"{_URL}/rest/v1/{table}"
    headers = {
        "apikey": _SERVICE_KEY,
        "Authorization": f"Bearer {_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    httpx.post(url, headers=headers, json=[data])

