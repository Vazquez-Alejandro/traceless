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

MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

async def enviar_factura_whatsapp(telefono: str, cliente: str, numero: str, total: float, pdf_url: str, fecha: str = "") -> dict:
    mes = ""
    if fecha:
        try:
            mes_num = int(fecha.split("-")[1])
            mes = MESES[mes_num]
        except (IndexError, ValueError):
            pass

    if mes:
        cuerpo = f"Hola {cliente}, te envío la factura correspondiente al mes de {mes}."
    else:
        cuerpo = f"Hola {cliente}, te envío tu factura."

    mensaje = (
        f"🧾 *Factura {numero}*\n\n"
        f"{cuerpo}\n\n"
        f"Total: *${total:,.2f}*\n\n"
        f"PDF: {pdf_url}\n\n"
        f"Gracias por tu confianza."
    )
    return await enviar_whatsapp(telefono, mensaje)
