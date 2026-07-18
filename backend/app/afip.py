import os
from datetime import datetime

AFIP_PRODUCTION = os.getenv("AFIP_PRODUCTION", "0") == "1"

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

def generar_factura_afip(cliente_cuit: str, cliente_nombre: str,
                          tipo: int, importe: float,
                          condicion_iva: str, descripcion: str) -> dict:
    if AFIP_PRODUCTION:
        return _wsfe_generate(cliente_cuit, tipo, importe, condicion_iva, descripcion)
    return _mock_generate(cliente_cuit, tipo, importe, descripcion)

def _mock_generate(cliente_cuit: str, tipo: int, importe: float, descripcion: str) -> dict:
    iva_percentage = 0.21
    if tipo == 6:  # Factura B
        iva_percentage = 0.21
    elif tipo == 11:  # Factura C
        iva_percentage = 0.21
    elif tipo == 19:  # Factura E
        iva_percentage = 0.105

    neto = round(importe / (1 + iva_percentage), 2)
    iva = round(importe - neto, 2)

    return {
        "cae": f"{datetime.now().strftime('%Y%m%d')}{str(hash(cliente_cuit))[-8:]}",
        "cae_vencimiento": datetime.now().strftime("%Y-%m-%d"),
        "numero": f"00001-{datetime.now().strftime('%Y%m%d')}-{abs(hash(descripcion)) % 99999999:08d}",
        "neto": neto,
        "iva": iva,
        "total": importe,
        "tipo": tipo,
    }

def _wsfe_generate(cliente_cuit: str, tipo: int, importe: float,
                    condicion_iva: str, descripcion: str) -> dict:
    raise NotImplementedError("AFIP producción no implementado aún")
