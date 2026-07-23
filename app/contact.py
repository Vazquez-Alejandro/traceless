import os, logging
import html
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("contact")
router = APIRouter(prefix="/api/contact", tags=["contact"])

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "soporte@traceless.com.ar")


class ContactForm(BaseModel):
    nombre: str
    email: str
    asunto: str
    mensaje: str


@router.post("")
def enviar_contacto(req: ContactForm):
    if not RESEND_API_KEY:
        raise HTTPException(500, "Servicio de correo no configurado")
    if len(req.nombre) > 200:
        raise HTTPException(400, "Nombre demasiado largo")
    if len(req.asunto) > 200:
        raise HTTPException(400, "Asunto demasiado largo")
    if len(req.mensaje) > 5000:
        raise HTTPException(400, "Mensaje demasiado largo (máximo 5000 caracteres)")

    import resend
    resend.api_key = RESEND_API_KEY

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Nuevo mensaje de contacto - TraceLess</h2>
      <hr style="border: 1px solid #e5e7eb;">
      <p><strong>Nombre:</strong> {html.escape(req.nombre)}</p>
      <p><strong>Email:</strong> {html.escape(req.email)}</p>
      <p><strong>Asunto:</strong> {html.escape(req.asunto)}</p>
      <hr style="border: 1px solid #e5e7eb;">
      <p style="white-space: pre-wrap;">{html.escape(req.mensaje)}</p>
      <hr style="border: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px;">Este mensaje fue enviado desde el formulario de contacto de TraceLess.</p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": f"TraceLess Contacto <soporte@traceless.com.ar>",
            "to": [CONTACT_EMAIL],
            "reply_to": req.email,
            "subject": f"[TraceLess] {req.asunto}",
            "html": html_content,
        })
    except Exception as e:
        logger.error(f"Error enviando mail de contacto: {e}")
        raise HTTPException(500, "Error al enviar el mensaje")

    # Notificar por Telegram
    try:
        import httpx
        httpx.post(
            "https://telegram-notifier-pmcs.onrender.com/notify",
            json={
                "app": "traceless",
                "event": "📩 Soporte - TraceLess",
                "message": f"Nombre: {req.nombre}\nEmail: {req.email}\nAsunto: {req.asunto}\n\n{req.mensaje[:200]}{'...' if len(req.mensaje) > 200 else ''}",
            },
            timeout=10,
        )
    except Exception as e:
        logger.error(f"Telegram notification error: {e}")

    return {"ok": True, "mensaje": "Mensaje enviado correctamente. Te responderemos a la brevedad."}
