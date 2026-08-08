"""Tests del rate limit distribuido sobre la tabla cache de Supabase."""

import time
from unittest.mock import MagicMock

import pytest

from app import auth


class _Cache:
    def __init__(self):
        self.rows = {}

    def table(self, name):
        return self

    def select(self, *cols):
        return self

    def eq(self, key, val):
        self._key = (key, val)
        return self

    def upsert(self, payload):
        self.rows[payload["key"]] = payload["token"]
        return self

    def execute(self):
        k = getattr(self, "_key", None)
        if k:
            _, val = k
            if val in self.rows:
                return MagicMock(data=[{"token": self.rows[val]}])
            return MagicMock(data=[])
        return MagicMock(data=[])

    def delete(self):
        return self


class _Req:
    def __init__(self, ip="1.2.3.4"):
        self.headers = {"x-forwarded-for": ip}
        self.client = MagicMock(host=ip)


def test_rate_limit_bloquea_al_superar_maximo(monkeypatch):
    store = _Cache()
    monkeypatch.setattr(auth, "supabase", store)

    # 2 llamadas permitidas, la tercera debe dar 429
    req = _Req()
    auth.rate_limit(req, "t", max_per_window=2, window_sec=60)
    auth.rate_limit(req, "t", max_per_window=2, window_sec=60)
    with pytest.raises(Exception) as exc:
        auth.rate_limit(req, "t", max_per_window=2, window_sec=60)
    assert hasattr(exc.value, "status_code") and exc.value.status_code == 429


def test_rate_limit_reinicia_ventana_al_expi_rar(monkeypatch):
    store = _Cache()
    monkeypatch.setattr(auth, "supabase", store)

    req = _Req()
    auth.rate_limit(req, "t", max_per_window=1, window_sec=60)
    # simular que pasó la ventana
    base = [time.time()]
    monkeypatch.setattr(auth.time, "time", lambda: base[0] + 120)
    # tras la ventana, se vuelve a permitir
    auth.rate_limit(req, "t", max_per_window=1, window_sec=60)


def test_rate_limit_no_revienta_si_falla_la_tabla(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("no hay tabla")

    monkeypatch.setattr(auth.supabase, "table", boom)
    req = _Req()
    try:
        auth.rate_limit(req, "x", max_per_window=1, window_sec=60)
    except Exception as e:
        raise AssertionError(f"rate_limit no debe reventar si falla la tabla: {e}")