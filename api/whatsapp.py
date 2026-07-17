import os
import httpx

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", "")

async def enviar_whatsapp(telefono: str, mensaje: str) -> dict:
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        return {"status": "no_configured"}

    url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": {"body": mensaje},
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, headers=headers)
        return res.json()

async def enviar_factura_whatsapp(telefono: str, cliente: str, numero: str, total: float, pdf_url: str) -> dict:
    mensaje = (
        f"🧾 *Factura {numero}*\n\n"
        f"Hola {cliente}, te enviamos tu factura por *${total:,.2f}*\n\n"
        f"Podés descargar el PDF acá: {pdf_url}\n\n"
        f"Gracias por tu confianza."
    )
    return await enviar_whatsapp(telefono, mensaje)
