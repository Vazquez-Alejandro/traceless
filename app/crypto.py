import os
import base64
import hashlib
from cryptography.fernet import Fernet

_ENC_PREFIX = "enc_arc:"


def _clave() -> bytes:
    secret = os.getenv("ARCA_ENC_KEY") or os.getenv("MP_WEBHOOK_SECRET") or ""
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def cifrar_secreto(plano: str) -> str:
    """Cifra el PEM de ARCA con Fernet y lo deja listo para guardar en la DB.

    Si no hay clave configurada, cae en el viejo formato arza_b64 (legacy).
    """
    if not plano:
        return ""
    if os.getenv("ARCA_ENC_KEY") or os.getenv("MP_WEBHOOK_SECRET"):
        try:
            token = Fernet(_clave()).encrypt(plano.encode())
            return _ENC_PREFIX + token.decode()
        except Exception:
            pass
    return "arza_b64:" + base64.b64encode(plano.encode()).decode()


def descifrar_secreto(guardado: str) -> str:
    """Decodifica el secreto guardado: enc_arc o legacy arza_b64 / PEM plano."""
    if not guardado:
        return ""
    if guardado.startswith(_ENC_PREFIX):
        try:
            return Fernet(_clave()).decrypt(guardado[len(_ENC_PREFIX):].encode()).decode()
        except Exception:
            return ""
    if guardado.startswith("arza_b64:"):
        try:
            return base64.b64decode(guardado.split(":", 1)[1]).decode()
        except Exception:
            return ""
    return guardado