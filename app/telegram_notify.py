"""
Funciones para enviar notificaciones por Telegram.
"""

import httpx
from typing import Optional

TELEGRAM_NOTIFIER_URL = "https://telegram-notifier-pmcs.onrender.com"

async def notify_telegram(app: str, event: str, message: str, details: Optional[dict] = None):
    """
    Envía una notificación al bot de Telegram.
    
    Args:
        app: Nombre de la app (traceless, inmoxil, revendr, priceanchor)
        event: Tipo de evento (registro, visita, pago, etc.)
        message: Mensaje descriptivo
        details: Detalles adicionales (opcional)
    """
    url = f"{TELEGRAM_NOTIFIER_URL}/notify"
    payload = {
        "app": app,
        "event": event,
        "message": message,
        "details": details or {},
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            return response.status_code == 200
    except Exception:
        return False


# Funciones de conveniencia para cada app

async def notify_user_registered(app: str, email: str, nombre: str = ""):
    """Notifica cuando un usuario se registra."""
    return await notify_telegram(
        app=app,
        event="👤 Nuevo registro",
        message=f"Email: {email}" + (f"\nNombre: {nombre}" if nombre else ""),
    )


async def notify_user_visit(app: str, page: str = "/"):
    """Notifica cuando alguien visita la app."""
    return await notify_telegram(
        app=app,
        event="👀 Nueva visita",
        message=f"Página: {page}",
    )


async def notify_payment(app: str, amount: float, currency: str = "USD"):
    """Notifica cuando se recibe un pago."""
    return await notify_telegram(
        app=app,
        event="💰 Pago recibido",
        message=f"Monto: {currency} {amount}",
    )


async def notify_invoice_created(app: str, invoice_number: str, total: float):
    """Notifica cuando se crea una factura."""
    return await notify_telegram(
        app=app,
        event="📄 Factura creada",
        message=f"Factura #{invoice_number}\nTotal: ${total}",
    )
