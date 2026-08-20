"""
WhatsApp HSM (Human-Service Message) Templates para Meta.

Para usar la API de WhatsApp Cloud, los mensajes business-initiated
requieren templates aprobados por Meta. Estos son los templates
que TraceLess usa para recordatorios y notificaciones.

PASOS PARA CONFIGURAR:
1. Ir a developers.facebook.com → tu app → WhatsApp → Message Templates
2. Crear un template por cada tipo de mensaje (ver abajo)
3. Esperar aprobación de Meta (1-24hs)
4. Copiar el nombre exacto del template en las variables de entorno

TEMPLATES A CREAR:
"""

TEMPLATES = {
    # Template 1: Envío de factura
    "invoice_notification": {
        "name": "traceless_invoice",  # Nombre en Meta
        "language": "es_AR",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Hola {{customer_name}}, te envío la factura *{{invoice_number}}* por *${{amount}}*. Podés verla y pagarla en el siguiente link: {{payment_link}} Gracias."
            }
        ],
        "variables": ["customer_name", "invoice_number", "amount", "payment_link"],
        "example": {
            "body_text": [["Leonardo", "0002-00000001", "15000.00", "https://www.traceless.com.ar/api/facturas/public/xxxxx"]]
        }
    },

    # Template 2: Recordatorio de cobro (30 días)
    "payment_reminder": {
        "name": "traceless_reminder",
        "language": "es_AR",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Hola {{customer_name}}, le recordamos que la factura *{{invoice_number}}* por *${{amount}}* venció hace {{days_overdue}} días. Si ya la pagó, disculpe las molestias. Quedamos a disposición."
            }
        ],
        "variables": ["customer_name", "invoice_number", "amount", "days_overdue"],
        "example": {
            "body_text": [["Leonardo", "0002-00000001", "15000.00", "30"]]
        }
    },

    # Template 3: Recordatorio de monotributo
    "monotributo_reminder": {
        "name": "traceless_monotributo",
        "language": "es_AR",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Hola {{customer_name}}, te recordamos que hoy vence la cuota del monotributo. No olvides pagarla para evitar recargos. ¡Éxitos con tu negocio!"
            }
        ],
        "variables": ["customer_name"],
        "example": {
            "body_text": [["Alejandro"]]
        }
    },
}


def get_template_for_invoice() -> str:
    """Retorna el nombre del template para envío de facturas."""
    return TEMPLATES["invoice_notification"]["name"]

def get_template_for_reminder() -> str:
    """Retorna el nombre del template para recordatorios de cobro."""
    return TEMPLATES["payment_reminder"]["name"]

def get_template_for_monotributo() -> str:
    """Retorna el nombre del template para recordatorio de monotributo."""
    return TEMPLATES["monotributo_reminder"]["name"]


# Instrucciones de configuración
SETUP_INSTRUCTIONS = """
=== CONFIGURACIÓN DE TEMPLATES WHATSAPP ===

1. Ir a: https://developers.facebook.com
2. Seleccionar tu app → WhatsApp → Message Templates
3. Crear 3 templates con estos datos:

TEMPLATE 1 - Envío de factura:
  Nombre: traceless_invoice
  Idioma: Spanish (Latin America) - es_AR
  Categoría: Utility
  Cuerpo:
    Hola {{customer_name}}, te envío la factura *{{invoice_number}}* por *${{amount}}*.
    Podés verla y pagarla en el siguiente link: {{payment_link}} Gracias.
  Ejemplos: customer_name=Leonardo, invoice_number=0002-00000001, amount=15000.00, payment_link=https://www.traceless.com.ar/api/facturas/public/xxxxx

TEMPLATE 2 - Recordatorio de cobro:
  Nombre: traceless_reminder
  Idioma: Spanish (Latin America) - es_AR
  Categoría: Utility
  Cuerpo:
    Hola {{customer_name}}, le recordamos que la factura *{{invoice_number}}* por *${{amount}}*
    venció hace {{days_overdue}} días. Si ya la pagó, disculpe las molestias.
    Quedamos a disposición.
  Ejemplos: customer_name=Leonardo, invoice_number=0002-00000001, amount=15000.00, days_overdue=30

TEMPLATE 3 - Recordatorio monotributo:
  Nombre: traceless_monotributo
  Idioma: Spanish (Latin America) - es_AR
  Categoría: Utility
  Cuerpo:
    Hola {{customer_name}}, te recordamos que hoy vence la cuota del monotributo.
    No olvides pagarla para evitar recargos. ¡Éxitos con tu negocio!
  Ejemplos: customer_name=Alejandro

4. Esperar aprobación de Meta (1-24 horas)
5. Configurar en Vercel:
   WA_TEMPLATE_INVOICE=traceless_invoice
   WA_TEMPLATE_REMINDER=traceless_reminder
   WA_TEMPLATE_MONOTRIBUTO=traceless_monotributo

============================================
"""
