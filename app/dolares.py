import os
import time
import httpx

# Precios en USD (base de todo; override opcional por env)
PRICES_USD = {
    "pro": {"usd": float(os.getenv("PRICE_PRO_USD", "12")), "name": "Profesional"},
    "team": {"usd": float(os.getenv("PRICE_TEAM_USD", "22")), "name": "Equipo"},
}

# Modo de cotización: oficial | blue | mep
DOLAR_MODE = os.getenv("DOLAR_MODE", "oficial").lower()

CACHE_TTL = 3600  # 1 hora
_cache: dict = {"ts": 0.0, "factor": None}


def _fetch(casa: str) -> dict:
    url = {
        "oficial": "https://dolarapi.com/v1/dolares/oficial",
        "blue": "https://dolarapi.com/v1/dolares/blue",
        "mep": "https://dolarapi.com/v1/dolares/bolsa",
    }.get(casa, "https://dolarapi.com/v1/dolares/oficial")
    r = httpx.get(url, timeout=10)
    r.raise_for_status()
    d = r.json()
    return {"compra": d.get("compra", 0.0), "venta": d.get("venta", 0.0)}


def get_factor() -> float:
    """Cotización USD->ARS (venta) con caché de 1 hora."""
    now = time.time()
    if _cache["factor"] and now - _cache["ts"] < CACHE_TTL:
        return _cache["factor"]
    try:
        f = _fetch(DOLAR_MODE)
        factor = float(f["venta"] or 0)
    except Exception:
        factor = 0.0
    if factor <= 0:
        return 0.0
    _cache["factor"] = factor
    _cache["ts"] = now
    return factor


def ars_from_usd(usd: float) -> int:
    factor = get_factor()
    if factor <= 0:
        return int(usd)
    return int(round(usd * factor))


def formato_ars(valor: float) -> str:
    return f"${valor:,.0f}".replace(",", ".")


def get_prices() -> dict:
    factor = get_factor()
    prices = {}
    for key, cfg in PRICES_USD.items():
        usd = cfg["usd"]
        ars = ars_from_usd(usd)
        prices[key] = {
            "usd": usd,
            "ars": ars,
            "name": cfg["name"],
            "label": f"USD {usd:,.0f}".replace(",", "."),
            "label_ars": f"${ars:,.0f}".replace(",", "."),
        }
    return {"prices": prices, "base": "USD", "tipo_cambio": factor, "dolar": DOLAR_MODE}
