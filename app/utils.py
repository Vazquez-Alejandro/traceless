import re


def normalizar_cuit(cuit: str) -> str:
    return re.sub(r"[^0-9]", "", cuit or "")


def validar_cuit_afip(cuit: str) -> bool:
    """Valida un CUIT argentino con el algoritmo de AFIP (11 dígitos + dígito verificador)."""
    c = normalizar_cuit(cuit)
    if not c or len(c) != 11:
        return False
    base = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    total = sum(int(d) * w for d, w in zip(c[:10], base))
    resto = total % 11
    if resto == 0:
        dv = 0
    elif resto == 1:
        dv = 9
    else:
        dv = 11 - resto
    return dv == int(c[10])
