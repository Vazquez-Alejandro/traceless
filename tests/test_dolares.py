"""Tests de conversión de precios USD -> ARS."""

import pytest

from app import dolares


def test_precios_anclados_en_usd():
    assert dolares.PRICES_USD["pro"]["usd"] == 12
    assert dolares.PRICES_USD["team"]["usd"] == 22


def test_ars_from_usd_con_factor_conocido(monkeypatch):
    monkeypatch.setattr(dolares, "get_factor", lambda: 1000.0)
    assert dolares.ars_from_usd(12) == 12000
    assert dolares.ars_from_usd(22) == 22000


def test_ars_from_usd_factor_cero_cae_a_usd(monkeypatch):
    monkeypatch.setattr(dolares, "get_factor", lambda: 0.0)
    assert dolares.ars_from_usd(12) == 12


def test_get_factor_refetch_cuando_cache_expirado(monkeypatch):
    import time
    # caché expirada -> debe re-fetch
    monkeypatch.setattr(dolares, "_fetch", lambda casa: {"compra": 900.0, "venta": 910.0})
    dolares._cache["factor"] = None
    dolares._cache["ts"] = time.time() - 10_000
    assert dolares.get_factor() == 910.0


def test_get_factor_usa_cache_valida(monkeypatch):
    import time
    # caché fresca -> NO vuelve a llamar al fetch
    def explode(casa):
        raise AssertionError("No debería llamar al fetch si hay caché válida")
    monkeypatch.setattr(dolares, "_fetch", explode)
    dolares._cache["factor"] = 500.0
    dolares._cache["ts"] = time.time()
    assert dolares.get_factor() == 500.0


def test_get_prices_estructura(monkeypatch):
    monkeypatch.setattr(dolares, "get_factor", lambda: 1000.0)
    res = dolares.get_prices()
    assert res["base"] == "USD"
    assert res["dolar"] == "oficial"
    assert res["prices"]["pro"]["usd"] == 12
    assert res["prices"]["pro"]["ars"] == 12000
    assert res["prices"]["team"]["usd"] == 22
    assert res["prices"]["team"]["ars"] == 22000


def test_formato_ars():
    assert dolares.formato_ars(12000) == "$12.000"
