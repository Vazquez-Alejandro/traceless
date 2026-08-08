import pytest

from app.utils import normalizar_cuit, validar_cuit_afip


def test_normalizar_cuit():
    assert normalizar_cuit("20-12345678-9") == "20123456789"
    assert normalizar_cuit("20123456789") == "20123456789"
    assert normalizar_cuit("") == ""
    assert normalizar_cuit(None) == ""


@pytest.mark.parametrize("cuit,esperado", [
    ("20123456786", True),
    ("20-12345678-6", True),
    ("20123456789", False),
    ("2012345678", False),
    ("00123456789", False),
    ("12345678901", False),
    ("", False),
])
def test_validar_cuit_afip(cuit, esperado):
    assert validar_cuit_afip(cuit) == esperado
