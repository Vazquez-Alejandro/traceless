from pathlib import Path
import tempfile

TMP = Path(tempfile.gettempdir()) / "traceless_facturas"
FACTURAS_DIR = TMP

def generar_html_factura(factura: dict, cliente: dict, emisor: dict) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8">
<title>Factura {factura['numero']}</title>
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #111; }}
  h1 {{ font-size: 22px; color: #1a56db; margin-bottom: 4px; }}
  .header {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
  .datos {{ font-size: 13px; color: #444; line-height: 1.6; }}
  table {{ width: 100%; border-collapse: collapse; margin: 30px 0; }}
  th {{ background: #1a56db; color: white; padding: 8px 12px; text-align: left; font-size: 12px; }}
  td {{ padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 13px; }}
  .totales {{ margin-left: auto; width: 280px; }}
  .totales td {{ border: none; padding: 4px 12px; }}
  .final {{ font-weight: bold; font-size: 16px; border-top: 2px solid #111; }}
  .cae {{ font-size: 11px; color: #888; text-align: center; margin-top: 40px; }}
</style></head><body>
  <div class="header">
    <div>
      <h1>{emisor.get('nombre', 'TraceLess')}</h1>
      <div class="datos">CUIT: {emisor.get('cuit', '')}<br>{emisor.get('direccion', '')}</div>
    </div>
    <div style="text-align:right">
      <h1>Factura {factura.get('tipo_nombre', 'B')}</h1>
      <div class="datos">NÂ° {factura['numero']}<br>{factura['fecha']}</div>
    </div>
  </div>
  <div class="datos">
    <strong>Cliente:</strong> {cliente.get('nombre', '')} {cliente.get('apellido', '')}<br>
    CUIT: {cliente.get('cuit', '-')}<br>
    IVA: {cliente.get('condicion_iva', 'Consumidor Final')}
  </div>
  <table>
    <tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">P.Unit</th><th style="text-align:right">Importe</th></tr>
    {"".join(_detalle_html(d) for d in _detalles(factura)) if _detalles(factura) else _default_item(factura)}
  </table>
  <table class="totales">
    <tr><td>Neto</td><td style="text-align:right">${factura.get('neto', factura['total']):,.2f}</td></tr>
    <tr><td>IVA</td><td style="text-align:right">${factura.get('iva', 0):,.2f}</td></tr>
    <tr class="final"><td>Total</td><td style="text-align:right">${factura['total']:,.2f}</td></tr>
  </table>
  <div class="cae">CAE: {factura['cae']} â€” Vence: {factura.get('cae_vencimiento', '')}</div>
</body></html>
"""

def guardar_factura_html(factura: dict, cliente: dict, emisor: dict) -> str:
    FACTURAS_DIR.mkdir(parents=True, exist_ok=True)
    html = generar_html_factura(factura, cliente, emisor)
    filename = f"factura-{factura['id']}.html"
    path = FACTURAS_DIR / filename
    path.write_text(html, encoding="utf-8")
    return f"/facturas/{filename}"

def _detalles(f):
    return f.get("detalles") or []

def _detalle_html(d):
    subt = d["cantidad"] * d["precio_unitario"]
    return f'<tr><td>{d["descripcion"]}</td><td style="text-align:center">{d["cantidad"]}</td><td style="text-align:right">${d["precio_unitario"]:,.2f}</td><td style="text-align:right">${subt:,.2f}</td></tr>'

def _default_item(f):
    return f'<tr><td colspan="3">{f.get("descripcion", "Servicios")}</td><td style="text-align:right">${f["total"]:,.2f}</td></tr>'

def generar_pdf_factura(factura: dict, cliente: dict, emisor: dict) -> bytes:
    return generar_html_factura(factura, cliente, emisor).encode("utf-8")
