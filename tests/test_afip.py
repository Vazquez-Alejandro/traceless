"""Tests del cálculo fiscal y funciones puras de app.afip."""

from datetime import date

from app import afip
from app.afip import _faecal, _simple_generate, cert_expiracion


def test_faecal_factura_c_no_iva():
    # Factura C (monotributo): no discrimina IVA
    neto, iva = _faecal(1250.0, 11)
    assert neto == 1250.0
    assert iva == 0.0


def test_faecal_factura_a_iva_21():
    neto, iva = _faecal(1210.0, 1)
    assert iva == 210.0
    assert abs(neto - 1000.0) < 0.01


def test_faecal_factura_b_iva_21():
    # Factura B (tipo 6): discrimina IVA 21%
    neto, iva = _faecal(1210.0, 6)
    assert iva == 210.0
    assert abs(neto - 1000.0) < 0.01


def test_faecal_tipo_19_iva_105():
    # Tipo 19: IVA 10.5%
    neto, iva = _faecal(1105.0, 19)
    assert iva == 105.0
    assert abs(neto - 1000.0) < 0.01


def test_simple_generate_sin_cae():
    res = _simple_generate({"pto_venta": 2, "nombre": "u"}, "cliente", 11, 100.0, "Test", 0)
    assert res["es_fiscal"] is False
    assert res["cae"] == ""
    assert res["numero"] == "0002-00000001"
    assert res["total"] == 100.0


def test_simple_generate_usa_ultimo_numero():
    res = _simple_generate({"pto_venta": 3, "nombre": "u"}, "cliente", 11, 100.0, "desc", 42)
    assert res["numero"] == "0003-00000043"


def test_cert_expiracion_con_pem_valido():
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    import datetime as dt

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = dt.datetime.now(dt.timezone.utc)
    subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, u"test")])
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=1))
        .not_valid_after(now + dt.timedelta(days=60))
        .sign(key, hashes.SHA256())
    )
    pem = cert.public_bytes(afip.serialization.Encoding.PEM).decode()
    exp = cert_expiracion(pem)
    assert exp is not None
    assert isinstance(exp, date)


def test_cert_expiracion_nulo():
    assert cert_expiracion(None) is None
    assert cert_expiracion("") is None
    assert cert_expiracion("no es pem not begin") is None


def test_cert_expiracion_pem_basura_no_rompe():
    assert cert_expiracion("-----BEGIN CERTIFICATE-----\nbasura\n-----END CERTIFICATE-----") is None