import os, base64, uuid, logging, ssl
from datetime import datetime, timedelta, timezone
from pathlib import Path
from lxml import etree
import requests
from requests.adapters import HTTPAdapter
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives.serialization.pkcs7 import PKCS7SignatureBuilder, PKCS7Options
from cryptography import x509


_arca_ctx = ssl.create_default_context()
_arca_ctx.check_hostname = False
_arca_ctx.verify_mode = ssl.CERT_NONE
_arca_ctx.set_ciphers("DEFAULT:@SECLEVEL=0")

class _ArcaAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        kwargs["ssl_context"] = _arca_ctx
        return super().init_poolmanager(*args, **kwargs)
    def proxy_manager_for(self, *args, **kwargs):
        kwargs["ssl_context"] = _arca_ctx
        return super().proxy_manager_for(*args, **kwargs)

_arca_ses = requests.Session()
_arca_ses.mount("https://", _ArcaAdapter())
_arca_transport = None

logger = logging.getLogger("afip")

ARCA_HOMO = os.getenv("ARCA_ENV", "homologacion") != "produccion"
CUIT = os.getenv("ARCA_CUIT", "20294796577")

# Configuración fiscal resuelta con defaults de env y override por usuario.
# Permitir que cada usuario use su propio CUIT + certificado es el objetivo:
# los valores por usuario llegan en 'fiscal' (dict) y sobreescriben a los de env.
_DEFAULT_FISCAL = {
    "cuit": CUIT,
    "cert": None,
    "key": None,
    "pto_venta": int(os.getenv("ARCA_PUNTO_VENTA", "2")),
    "homologacion": os.getenv("ARCA_ENV", "homologacion") != "produccion",
    "use_real": os.getenv("ARCA_USE_REAL", "1") == "1",
    "nombre": "Usuario TraceLess",
    "direccion": "",
    "condicion_iva": "Responsable Inscripto",
}


def _resolver_cfg(fiscal: dict | None = None) -> dict:
    cfg = dict(_DEFAULT_FISCAL)
    if fiscal is None:
        cfg["cert"], cfg["key"] = _cargar_certs()
        return cfg
    for k in ("cuit", "pto_venta", "homologacion", "use_real", "nombre", "direccion", "condicion_iva"):
        if fiscal.get(k) is not None:
            cfg[k] = fiscal[k]
    # En el camino por-usuario NO heredamos el cert global: si el usuario no cargó
    # su propio certificado, emitimos comprobante simple (sin CAE). Esto evita
    # facturar con una identidad fiscal distinta a la del usuario (error 10007).
    if fiscal.get("cert"):
        cfg["cert"], cfg["key"] = fiscal["cert"], fiscal["key"]
    else:
        cfg["cert"], cfg["key"] = None, None
    return cfg

def _wsdl_wsaa(homologacion: bool) -> str:
    return ("https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl" if homologacion
            else "https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl")

def _wsdl_wsfe(homologacion: bool) -> str:
    return ("https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL" if homologacion
            else "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL")

_ta_cache = None

def _cargar_certs():
    try:
        env = os.getenv("ARCA_CERT_B64")
        env_key = os.getenv("ARCA_KEY_B64")
        if env and env_key:
            return base64.b64decode(env).decode(), base64.b64decode(env_key).decode()
        cert_path = os.getenv("ARCA_CERT_PATH", "certs/cert.pem")
        key_path = os.getenv("ARCA_KEY_PATH", "certs/key.pem")
        if not Path(cert_path).exists() or not Path(key_path).exists():
            return None, None
        return Path(cert_path).read_text(), Path(key_path).read_text()
    except Exception:
        return None, None

def _fecha_utc():
    return datetime.now(timezone.utc)

def cert_expiracion(cert_pem: str | None):
    """Devuelve la fecha de vencimiento (date) del certificado PEM, o None si no se puede leer."""
    if not cert_pem or "BEGIN" not in cert_pem:
        return None
    try:
        cert = x509.load_pem_x509_certificate(cert_pem.encode())
        return cert.not_valid_after_utc.date()
    except Exception:
        return None

def _generar_tra() -> bytes:
    tz = timezone(timedelta(hours=-3))
    now = datetime.now(tz)
    exp = now + timedelta(hours=12)
    uid = uuid.uuid4().int & 0xFFFFFFFF
    xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<loginTicketRequest version="1.0">
    <header>
        <uniqueId>{uid}</uniqueId>
        <generationTime>{now.strftime("%Y-%m-%dT%H:%M:%S.000")}-03:00</generationTime>
        <expirationTime>{exp.strftime("%Y-%m-%dT%H:%M:%S.000")}-03:00</expirationTime>
    </header>
    <service>wsfe</service>
</loginTicketRequest>"""
    return xml.encode("utf-8")

def _firmar_cms(tra: bytes, cert_pem: str, key_pem: str) -> str:
    cert = x509.load_pem_x509_certificate(cert_pem.encode())
    key = load_pem_private_key(key_pem.encode(), password=None)
    builder = PKCS7SignatureBuilder().set_data(tra)
    builder = builder.add_signer(cert, key, hashes.SHA256())
    cms = builder.sign(serialization.Encoding.DER, [PKCS7Options.Binary])
    return base64.b64encode(cms).decode()

_CACHE_PATH = "/tmp/arcata.json"

def _ta_key(key_id: str = "arcata") -> str:
    return f"arcata::{key_id}"

def _ta_cache_load(key_id: str = "arcata") -> dict | None:
    cache_key = _ta_key(key_id)
    # Try Supabase first
    try:
        from app.db import supabase
        r = supabase.table("cache").select("*").eq("key", cache_key).single().execute()
        if r.data:
            d = r.data
            d["expires"] = datetime.fromisoformat(d["expires"])
            if d["expires"] > datetime.now(timezone.utc):
                return d
    except Exception:
        pass
    # Fallback to file
    try:
        import json
        d = json.loads(open(_CACHE_PATH).read())
        if d.get("_key") and d["_key"] != key_id:
            return None
        d["expires"] = datetime.fromisoformat(d["expires"])
        return d
    except Exception:
        return None

def _ta_cache_save(ta: dict):
    import json
    key_id = ta.get("_key", "arcata")
    cache_key = _ta_key(key_id)
    d = dict(ta)
    d["expires"] = ta["expires"].isoformat()
    # Try Supabase
    try:
        from app.db import supabase
        supabase.table("cache").upsert({"key": cache_key, **d, "expires": d["expires"]}).execute()
    except Exception:
        pass
    # File fallback
    try:
        open(_CACHE_PATH, "w").write(json.dumps(d))
    except Exception:
        pass

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=20),
       retry=retry_if_exception_type((RuntimeError, ConnectionError, TimeoutError)))
def _login(cfg: dict | None = None) -> dict:
    global _ta_cache
    cfg = cfg or _resolver_cfg()
    now = datetime.now(timezone.utc)
    cuit = cfg["cuit"]
    key_id = f"{cuit}|{cfg.get('homologacion')}"

    if _ta_cache and _ta_cache.get("_key") == key_id and _ta_cache["expires"] > now:
        return _ta_cache

    cached = _ta_cache_load(key_id)
    if cached and cached["expires"] > now:
        _ta_cache = cached
        return cached

    cert, key = cfg["cert"], cfg["key"]
    tra = _generar_tra()
    cms_b64 = _firmar_cms(tra, cert, key)

    import zeep
    from zeep.transports import Transport
    global _arca_transport
    if _arca_transport is None:
        _arca_transport = Transport(session=_arca_ses, timeout=30)
    client = zeep.Client(
        wsdl=_wsdl_wsaa(cfg.get("homologacion", True)),
        settings=zeep.Settings(strict=False),
        transport=_arca_transport,
    )
    service = client.bind('LoginCMSService', 'LoginCms')

    try:
        resp = service.loginCms(in0=cms_b64)
    except Exception as e:
        if "alreadyAuthenticated" in str(e):
            fresh = _ta_cache_load(key_id)
            if fresh and fresh["expires"] > now:
                _ta_cache = fresh
                return fresh
            raise RuntimeError(
                "ARCA ya emitió un TA válido y no permite emitir otro hasta que expire "
                "(retención de 10 min en homologación, 2 min en producción). "
                "Si es la primera vez que ejecutás desde esta instancia, esperá "
                "a que expire el TA anterior (~12h desde su emisión). "
                "Error: alreadyAuthenticated"
            )
        elif "coe.notAuthorized" in str(e):
            raise RuntimeError("Certificado no autorizado para el servicio wsfe. "
                                "Verificá que la autorización esté activa en WSASS.")
        elif "cms.cert.untrusted" in str(e):
            raise RuntimeError("Certificado no emitido por CA de confianza de ARCA (homologación).")
        elif "cms.sign.invalid" in str(e):
            raise RuntimeError("Firma inválida del CMS. Verificá el par certificado/clave.")
        else:
            raise

    root = etree.fromstring(resp.encode())
    token = root.findtext(".//token")
    sign = root.findtext(".//sign")
    exp = root.findtext(".//expirationTime")
    expires = datetime.fromisoformat(exp) if exp else now + timedelta(hours=12)

    _ta_cache = {"token": token, "sign": sign, "expires": expires, "_key": key_id}
    _ta_cache_save(_ta_cache)
    return _ta_cache

def get_tipos_comprobante():
    return [
        {"codigo": 1, "nombre": "Factura A"},
        {"codigo": 6, "nombre": "Factura B"},
        {"codigo": 11, "nombre": "Factura C"},
        {"codigo": 19, "nombre": "Factura E"},
    ]

def get_condiciones_iva():
    return [
        "Responsable Inscripto",
        "Responsable Monotributo",
        "Consumidor Final",
        "Exento",
        "No Responsable",
    ]

def _punto_venta() -> int:
    return int(os.getenv("ARCA_PUNTO_VENTA", "2"))

def _doc_tipo(cuit: str) -> tuple:
    return (80, cuit.replace("-", ""))

def _alicuota_iva(tipo: int) -> tuple:
    if tipo == 19:
        return (4, 10.5)
    return (3, 21.0)

# RG 5616: CondicionIVAReceptorId (obligatorio desde 01/09/2026)
_COND_ICA_RECEPTOR_MAP = {
    "Responsable Inscripto": 1,
    "Responsable Monotributo": 4,
    "Monotributo": 4,
    "Consumidor Final": 5,
    "Exento": 6,
    "No Responsable": 7,
}

def _condicion_iva_receptor_id(condicion_iva: str) -> int:
    return _COND_ICA_RECEPTOR_MAP.get(condicion_iva, 5)

def generar_factura_afip(cliente_cuit: str, cliente_nombre: str,
                          tipo: int, importe: float,
                          condicion_iva: str, descripcion: str,
                          ultimo_numero: int = 0,
                          fiscal: dict | None = None,
                          factura_original_tipo: int | None = None,
                          factura_original_numero: str = "") -> dict:
    cfg = _resolver_cfg(fiscal)

    # El usuario necesita sí o sí su certificado para emitir con CAE fiscal.
    # Sin certificado emitimos un comprobante simple legítimo (sin CAE):
    # sirve como presupuesto / nota de venta y NO implica documentación fiscal.
    if not cfg.get("cert") or not cfg.get("key"):
        return _simple_generate(cfg, cliente_cuit, tipo, importe, descripcion, ultimo_numero)

    if cfg.get("use_real"):
        return _wsfe_solicitar(cliente_cuit, cliente_nombre, tipo, importe, condicion_iva, descripcion, ultimo_numero, cfg,
                               factura_original_tipo, factura_original_numero)
    return _simple_generate(cfg, cliente_cuit, tipo, importe, descripcion, ultimo_numero)

def _faecal(importe: float, tipo: int) -> tuple[float, float]:
    if tipo == 11:  # Factura C (monotributo) no discrimina IVA
        return round(importe, 2), 0.0
    pct = 0.105 if tipo == 19 else 0.21
    neto = round(importe / (1 + pct), 2)
    iva = round(importe - neto, 2)
    return neto, iva

def _simple_generate(cfg: dict, cliente_cuit: str, tipo: int, importe: float, descripcion: str, ultimo_numero: int = 0) -> dict:
    pto = int(cfg.get("pto_venta", 2))
    neto, iva = _faecal(importe, tipo)
    prox = ultimo_numero + 1
    return {
        "cae": "",
        "cae_vencimiento": "",
        "numero": f"{pto:04d}-{prox:08d}",
        "neto": neto,
        "iva": iva,
        "total": importe,
        "tipo": tipo,
        "es_fiscal": False,
    }

def _wsfe_solicitar(cliente_cuit: str, cliente_nombre: str,
                    tipo: int, importe: float,
                    condicion_iva: str, descripcion: str,
                    ultimo_numero: int = 0,
                    cfg: dict | None = None,
                    factura_original_tipo: int | None = None,
                    factura_original_numero: str = "") -> dict:
    cfg = cfg or _resolver_cfg()

    # Aviso claro si el certificado venció: no tiene sentido pedir CAE a ARCA
    # con un cert vencido (ARCA lo rechaza con un error confuso).
    expira = cert_expiracion(cfg.get("cert"))
    if expira:
        hoy = datetime.now(timezone.utc).date()
        if expira < hoy:
            raise RuntimeError(
                f"Tu certificado digital de ARCA venció el {expira.strftime('%d/%m/%Y')}. "
                "Generá un certificado nuevo en AFIP (Web Services → Administrador de Certificados) "
                "y actualizalo en Perfil → Facturación fiscal (ARCA)."
            )

    ta = _login(cfg)
    pto_vta = int(cfg.get("pto_venta", 2))
    auth_cuit = cfg["cuit"]
    doc_tipo, doc_nro = _doc_tipo(cliente_cuit)

    es_iva_c = (tipo in (11, 13))  # Factura C y NC C: no discriminan IVA

    if es_iva_c:
        neto = round(importe, 2)
        iva_imp = 0
        iva_id = None
    else:
        iva_id, iva_pct = _alicuota_iva(tipo)
        neto = round(importe / (1 + iva_pct / 100), 2)
        iva_imp = round(neto * iva_pct / 100, 2)

    import zeep
    from zeep.transports import Transport
    global _arca_transport
    if _arca_transport is None:
        _arca_transport = Transport(session=_arca_ses, timeout=30)
    client = zeep.Client(wsdl=_wsdl_wsfe(cfg.get("homologacion", True)), transport=_arca_transport, settings=zeep.Settings(strict=False))
    auth = {"Token": ta["token"], "Sign": ta["sign"], "Cuit": auth_cuit}

    ultimo_arca = client.service.FECompUltimoAutorizado(Auth=auth, PtoVta=pto_vta, CbteTipo=tipo)
    if hasattr(ultimo_arca, 'Errors') and ultimo_arca.Errors:
        from zeep.helpers import serialize_object
        raise RuntimeError(f"Error al obtener último comprobante: {serialize_object(ultimo_arca.Errors)}")
    prox_numero = (ultimo_arca.CbteNro or 0) + 1

    det_request = {
        "Concepto": 1,
        "DocTipo": doc_tipo,
        "DocNro": doc_nro,
        "CondicionIVAReceptorId": _condicion_iva_receptor_id(condicion_iva),
        "CbteDesde": prox_numero,
        "CbteHasta": prox_numero,
        "CbteFch": datetime.now().strftime("%Y%m%d"),
        "ImpTotal": neto + iva_imp,
        "ImpTotConc": 0,
        "ImpNeto": neto,
        "ImpOpEx": 0,
        "ImpTrib": 0,
        "ImpIVA": iva_imp,
        "FchServDesde": None,
        "FchServHasta": None,
        "FchVtoPago": None,
        "MonId": "PES",
        "MonCotiz": 1,
    }

    if not es_iva_c and iva_id is not None:
        det_request["Iva"] = {
            "AlicIva": {
                "Id": iva_id,
                "BaseImp": neto,
                "Importe": iva_imp,
            }
        }

    # Para comprobantes débito/crédito (NC/ND) ARCA exige la referencia al comprobante original.
    if factura_original_tipo and factura_original_numero:
        try:
            orig_pto, orig_nro = factura_original_numero.split("-")
            det_request["CbtesAsoc"] = {
                "CbteAsoc": {
                    "Tipo": factura_original_tipo,
                    "PtoVta": int(orig_pto),
                    "Nro": int(orig_nro),
                    "Cuit": auth_cuit,
                }
            }
        except Exception:
            det_request.pop("CbtesAsoc", None)

    req = {
        "Auth": auth,
        "FeCAEReq": {
            "FeCabReq": {
                "CantReg": 1,
                "PtoVta": pto_vta,
                "CbteTipo": tipo,
            },
            "FeDetReq": {
                "FECAEDetRequest": det_request,
            },
        }
    }

    try:
        resp = client.service.FECAESolicitar(**req)
    except Exception as e:
        raise RuntimeError(f"Error en FECAESolicitar: {e}")

    if hasattr(resp, 'Errors') and resp.Errors:
        from zeep.helpers import serialize_object
        raise RuntimeError(f"Errores ARCA: {serialize_object(resp.Errors)}")

    ed = resp.FeDetResp.FECAEDetResponse[0]

    if ed.Resultado == "R":
        from zeep.helpers import serialize_object
        try:
            obs = serialize_object(ed.Observaciones) if hasattr(ed, "Observaciones") and ed.Observaciones else {}
        except Exception:
            obs = {}
        msgs = [o.get("Msg", "") for o in (obs.get("Obs", []) if isinstance(obs, dict) else [])]
        raise RuntimeError(f"ARCA rechazó: {'; '.join(msgs)}" if msgs else "ARCA rechazó el comprobante")

    return {
        "cae": ed.CAE,
        "cae_vencimiento": ed.CAEFchVto,
        "numero": f"{pto_vta:04d}-{ed.CbteDesde:08d}",
        "neto": neto,
        "iva": iva_imp,
        "total": neto + iva_imp,
        "tipo": tipo,
    }
