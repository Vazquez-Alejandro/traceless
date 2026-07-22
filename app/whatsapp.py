import os
import httpx

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", "")
WA_TEMPLATE_INVOICE = os.getenv("WA_TEMPLATE_INVOICE", "")
WA_TEMPLATE_REMINDER = os.getenv("WA_TEMPLATE_REMINDER", "")
WA_TEMPLATE_MONOTRIBUTO = os.getenv("WA_TEMPLATE_MONOTRIBUTO", "")

FOOTER = "\n\n✶ Hecho con TraceLess — traceless.com.ar"

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
        "text": {"body": mensaje + FOOTER},
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, headers=headers)
        return res.json()


async def enviar_whatsapp_template(telefono: str, template_name: str, variables: list[str], lang: str = "es_AR") -> dict:
    """Envía un mensaje template aprobado por Meta (requiere HSM)."""
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID or not template_name:
        return {"status": "no_configured"}

    url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    body_params = [{"type": "text", "text": v} for v in variables]
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": lang},
            "components": [{"type": "body", "parameters": body_params}],
        },
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, headers=headers)
        return res.json()


MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

async def enviar_factura_whatsapp(telefono: str, cliente: str, numero: str, total: float, pdf_url: str, fecha: str = "", mp_link: str = "") -> dict:
    if WA_TEMPLATE_INVOICE:
        link = mp_link if mp_link else pdf_url
        return await enviar_whatsapp_template(telefono, WA_TEMPLATE_INVOICE, [cliente, numero, f"{total:,.2f}", link])

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
        f"PDF: {pdf_url}"
    )
    if mp_link:
        mensaje += f"\n\n💳 *Pagá online:* {mp_link}"
    return await enviar_whatsapp(telefono, mensaje)


async def enviar_recordatorio_whatsapp(telefono: str, cliente: str, numero: str, total: float, dias: int) -> dict:
    if WA_TEMPLATE_REMINDER:
        return await enviar_whatsapp_template(telefono, WA_TEMPLATE_REMINDER, [cliente, numero, f"{total:,.2f}", str(dias)])

    mensaje = (
        f"Hola {cliente}, le recordamos que la factura *{numero}* "
        f"por *${total:,.2f}* venció hace {dias} días. "
        f"Si ya la pagó, disculpe las molestias."
    )
    return await enviar_whatsapp(telefono, mensaje)


async def enviar_recordatorio_monotributo_whatsapp(telefono: str, nombre: str) -> dict:
    if WA_TEMPLATE_MONOTRIBUTO:
        return await enviar_whatsapp_template(telefono, WA_TEMPLATE_MONOTRIBUTO, [nombre])

    mensaje = (
        f"Hola {nombre}, te recordamos que hoy vence la cuota del monotributo. "
        f"No olvides pagarla para evitar recargos."
    )
    return await enviar_whatsapp(telefono, mensaje)
