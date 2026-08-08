"""Tests de tokens de verificación y reset (funciones puras de app.auth)."""

import pytest
from datetime import timedelta

from app import auth

# Aislar para no tocar env real
VERIFY_SECRET = "test-secret-para-pruebas"


@pytest.fixture(autouse=True)
def _force_secret(monkeypatch):
    monkeypatch.setattr(auth, "VERIFY_SECRET", VERIFY_SECRET)


def test_verify_token_roundtrip():
    token = auth.create_verify_token("cliente@test.com")
    assert auth.verify_token(token) == "cliente@test.com"


def test_verify_token_rechaza_tipo_reset():
    reset = auth.create_reset_token("a@b.com")
    # un token de reset no debe validar como verify
    assert auth.verify_token(reset) is None


def test_verify_token_firma_incorrecta():
    token = auth.create_verify_token("a@b.com")
    bad = token[:-3] + "abc"
    assert auth.verify_token(bad) is None


def test_reset_token_roundtrip():
    token = auth.create_reset_token("cliente@test.com")
    assert auth.verify_reset_token(token) == "cliente@test.com"


def test_reset_token_no_acepta_verify():
    token = auth.create_verify_token("a@b.com")
    assert auth.verify_reset_token(token) is None


def test_tokens_no_contienen_email_en_claro():
    token = auth.create_verify_token("super-secreto@test.com")
    assert "super-secreto" not in token
