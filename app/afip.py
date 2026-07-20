import os, base64, uuid, logging, ssl
from datetime import datetime, timedelta, timezone
from pathlib import Path
from lxml import etree
import requests
from requests.adapters import HTTPAdapter


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

_WSAA_WSDL = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl"
_WSFE_WSDL = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
if not ARCA_HOMO:
    _WSAA_WSDL = "https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl"
    _WSFE_WSDL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"

_ta_cache = None

def _cargar_certs():
    env = os.getenv("ARCA_CERT_B64")
    env_key = os.getenv("ARCA_KEY_B64")
    if env and env_key:
        cert = base64.b64decode(env).decode()
        key = base64.b64decode(env_key).decode()
    else:
        d = Path("/home/alejandro")
        cert = (d / "arca.crt").read_text()
        key = (d / "arca.key").read_text()
    return cert, key

def _fecha_utc():
    return datetime.now(timezone.utc)

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

def _ta_cache_load() -> dict | None:
    # Try Supabase first
    try:
        from app.db import supabase
        r = supabase.table("cache").select("*").eq("key", "arcata").single().execute()
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
        d["expires"] = datetime.fromisoformat(d["expires"])
        return d
    except Exception:
        return None

def _ta_cache_save(ta: dict):
    import json
    d = dict(ta)
    d["expires"] = ta["expires"].isoformat()
    # Try Supabase
    try:
        from app.db import supabase
        supabase.table("cache").upsert({"key": "arcata", **d, "expires": d["expires"]}).execute()
    except Exception:
        pass
    # File fallback
    try:
        open(_CACHE_PATH, "w").write(json.dumps(d))
    except Exception:
        pass

def _login() -> dict:
    global _ta_cache
    now = datetime.now(timezone.utc)

    cached = _ta_cache or _ta_cache_load()
    if cached and cached["expires"] > now:
        _ta_cache = cached
        return cached

    cert, key = _cargar_certs()
    tra = _generar_tra()
    cms_b64 = _firmar_cms(tra, cert, key)

    import zeep
    from zeep.transports import Transport
    global _arca_transport
    if _arca_transport is None:
        _arca_transport = Transport(session=_arca_ses)
    client = zeep.Client(
        wsdl=_WSAA_WSDL,
        settings=zeep.Settings(strict=False),
        transport=_arca_transport,
    )
    service = client.bind('LoginCMSService', 'LoginCms')

    try:
        resp = service.loginCms(in0=cms_b64)
    except Exception as e:
        if "alreadyAuthenticated" in str(e):
            fresh = _ta_cache_load()
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

    _ta_cache = {"token": token, "sign": sign, "expires": expires}
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
    return int(os.getenv("ARCA_PUNTO_VENTA", "1"))

def _doc_tipo(cuit: str) -> tuple:
    return (80, cuit.replace("-", ""))

def _alicuota_iva(tipo: int) -> tuple:
    if tipo == 19:
        return (4, 10.5)
    return (3, 21.0)

def generar_factura_afip(cliente_cuit: str, cliente_nombre: str,
                          tipo: int, importe: float,
                          condicion_iva: str, descripcion: str,
                          ultimo_numero: int = 0) -> dict:
    USE_REAL = os.getenv("ARCA_USE_REAL", "0") == "1"
    if USE_REAL:
        try:
            return _wsfe_solicitar(cliente_cuit, cliente_nombre, tipo, importe, condicion_iva, descripcion, ultimo_numero)
        except Exception as e:
            logger.exception("ARCA real falló: %s", e)
            import traceback
            tb = traceback.format_exc()
            logger.error("Traceback ARCA:\n%s", tb)
    return _mock_generate(cliente_cuit, tipo, importe, descripcion, ultimo_numero)

def _mock_generate(cliente_cuit: str, tipo: int, importe: float, descripcion: str, ultimo_numero: int = 0) -> dict:
    iva_percentage = 0.21
    if tipo == 19:
        iva_percentage = 0.105
    neto = round(importe / (1 + iva_percentage), 2)
    iva = round(importe - neto, 2)
    prox = ultimo_numero + 1
    return {
        "cae": f"{datetime.now().strftime('%Y%m%d')}{prox:08d}",
        "cae_vencimiento": datetime.now().strftime("%Y-%m-%d"),
        "numero": f"{_punto_venta():04d}-{prox:08d}",
        "neto": neto,
        "iva": iva,
        "total": importe,
        "tipo": tipo,
    }

def _wsfe_solicitar(cliente_cuit: str, cliente_nombre: str,
                     tipo: int, importe: float,
                     condicion_iva: str, descripcion: str,
                     ultimo_numero: int = 0) -> dict:
    ta = _login()
    pto_vta = _punto_venta()
    doc_tipo, doc_nro = _doc_tipo(cliente_cuit)
    iva_id, iva_pct = _alicuota_iva(tipo)
    neto = round(importe / (1 + iva_pct / 100), 2)
    iva_imp = round(neto * iva_pct / 100, 2)

    import zeep
    from zeep.transports import Transport
    global _arca_transport
    if _arca_transport is None:
        _arca_transport = Transport(session=_arca_ses)
    client = zeep.Client(wsdl=_WSFE_WSDL, transport=_arca_transport)
    auth = {"Token": ta["token"], "Sign": ta["sign"], "Cuit": CUIT}

    req = {
        "Auth": auth,
        "FeCAEReq": {
            "FeCabReq": {
                "CantReg": 1,
                "PtoVta": pto_vta,
                "CbteTipo": tipo,
            },
            "FeDetReq": {
                "FECAEDetRequest": {
                    "Concepto": 1,
                    "DocTipo": doc_tipo,
                    "DocNro": doc_nro,
                    "CbteDesde": 1,
                    "CbteHasta": 1,
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
                    "Iva": {
                        "AlicIva": {
                            "Id": iva_id,
                            "BaseImp": neto,
                            "Importe": iva_imp,
                        }
                    },
                }
            },
        }
    }

    try:
        resp = client.service.FECAESolicitar(**req)
    except Exception as e:
        raise RuntimeError(f"Error en FECAESolicitar: {e}")

    if hasattr(resp, 'Errors') and resp.Errors:
        from zeep.helpers import serialize_object
        errs = []
        raw = resp.Errors
        if hasattr(raw, 'Err'):
            items = raw.Err if isinstance(raw.Err, list) else [raw.Err]
            for e in items:
                ser = serialize_object(e)
                cod = ser.get('Codigo', ser.get('codigo', '?'))
                desc = ser.get('Descripcion', ser.get('descripcion', str(ser)))
                errs.append(f"[{cod}] {desc}")
        else:
            errs.append(str(serialize_object(raw)))
        raise RuntimeError("Errores ARCA: " + " | ".join(errs))

    total_final = neto + iva_imp
    ed = resp.FeDetResp.FECAEDetResponse[0]
    return {
        "cae": ed.CAE,
        "cae_vencimiento": ed.CAEFchVto,
        "numero": f"{pto_vta:04d}-{ed.CbteDesde:08d}",
        "neto": neto,
        "iva": iva_imp,
        "total": total_final,
        "tipo": tipo,
    }
