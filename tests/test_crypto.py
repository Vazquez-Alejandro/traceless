import os

import pytest

os.environ.setdefault("MP_WEBHOOK_SECRET", "test-secret-para-crypto")

from app.crypto import cifrar_secreto, descifrar_secreto


def test_roundtrip_cifrado():
    pem = "BEGIN PRIVATE KEY abc123 END"
    enc = cifrar_secreto(pem)
    assert enc.startswith("enc_arc:")
    assert descifrar_secreto(enc) == pem


def test_legacy_arza_b64():
    import base64

    pem = "BEGIN CERT abc456 END"
    enc = "arza_b64:" + base64.b64encode(pem.encode()).decode()
    assert descifrar_secreto(enc) == pem


def test_vacio_y_plano():
    assert descifrar_secreto("") == ""
    assert descifrar_secreto("PEM plano") == "PEM plano"