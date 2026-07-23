import os
import logging
import html as html_mod

logger = logging.getLogger("email_sender")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM", "TraceLess <onboarding@resend.dev>")


def enviar_factura_email(email_cliente: str, nombre_cliente: str, numero: str, total: float, pdf_url: str, mp_link: str = "", emisor_nombre: str = "") -> bool:
    if not RESEND_API_KEY or not email_cliente:
        return False

    import resend
    resend.api_key = RESEND_FROM.split("<")[-1].replace(">", "").strip() if "<" in RESEND_FROM else RESEND_API_KEY
    resend.api_key = RESEND_API_KEY

    asunto = f"Factura {numero} de {emisor_nombre or 'TraceLess'}"

    mp_section = ""
    if mp_link:
        mp_section = f'<p style="margin:20px 0"><a href="{html_mod.escape(mp_link)}" style="display:inline-block;padding:12px 24px;background:#009ee3;color:white;border-radius:8px;text-decoration:none;font-weight:bold">💳 Pagar online con MercadoPago</a></p>'

    html_content = f"""
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
      <h2 style="color:#1a56db;margin-bottom:4px">Factura {html_mod.escape(numero)}</h2>
      <p style="color:#666;font-size:13px;margin-top:0">De {html_mod.escape(emisor_nombre or 'TraceLess')}</p>
      <hr style="border:1px solid #e5e7eb">
      <p>Hola <strong>{html_mod.escape(nombre_cliente)}</strong>,</p>
      <p>Te enviamos la factura <strong>{html_mod.escape(numero)}</strong> por un total de <strong>${total:,.2f}</strong>.</p>
      <p style="margin:20px 0">
        <a href="{html_mod.escape(pdf_url)}" style="display:inline-block;padding:12px 24px;background:#1a56db;color:white;border-radius:8px;text-decoration:none;font-bold">📄 Ver factura</a>
      </p>
      {mp_section}
      <hr style="border:1px solid #e5e7eb;margin:20px 0">
      <p style="color:#999;font-size:11px;text-align:center">⚡ Facturación automática con <strong>TraceLess</strong> — traceless.com.ar</p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": RESEND_FROM,
            "to": [email_cliente],
            "subject": asunto,
            "html": html_content,
        })
        logger.info(f"Email de factura {numero} enviado a {email_cliente}")
        return True
    except Exception as e:
        logger.error(f"Error enviando email de factura: {e}")
        return False
