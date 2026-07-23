from pathlib import Path
import tempfile
import base64
import html as html_mod

TMP = Path(tempfile.gettempdir()) / "traceless_facturas"
FACTURAS_DIR = TMP

def _generar_qr_pago(monto: float, cbu: str, alias_banco: str, emisor_nombre: str) -> str:
    if not cbu and not alias_banco:
        return ""
    try:
        import qrcode
        import qrcode.constants
        lineas = []
        if cbu:
            lineas.append(f"CBU: {cbu}")
        if alias_banco:
            lineas.append(f"Alias: {alias_banco}")
        lineas.append(f"Monto: ${monto:,.2f}")
        lineas.append(f"Beneficiario: {emisor_nombre}")
        texto = "\n".join(lineas)
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=2)
        qr.add_data(texto)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        import io
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f'<img src="data:image/png;base64,{b64}" style="width:160px;height:160px" />'
    except Exception:
        return ""

def generar_html_factura(factura: dict, cliente: dict, emisor: dict) -> str:
    cbu = emisor.get("cbu", "")
    alias_banco = emisor.get("alias_banco", "")
    qr_html = _generar_qr_pago(factura["total"], cbu, alias_banco, emisor.get("nombre", ""))

    mp_link = factura.get("mp_link", "")
    mp_section = ""
    if mp_link:
        mp_link_escaped = html_mod.escape(mp_link)
        mp_section = f'<div style="margin-top:20px;text-align:center"><a href="{mp_link_escaped}" style="display:inline-block;padding:10px 24px;background:#009ee3;color:white;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">💳 Pagar online con MercadoPago</a></div>'

    cbu_section = ""
    if cbu or alias_banco:
        cbu_lines = ""
        if cbu:
            cbu_lines += f"<div><strong>CBU:</strong> <span style='font-family:monospace'>{html_mod.escape(cbu)}</span></div>"
        if alias_banco:
            cbu_lines += f"<div><strong>Alias:</strong> <span style='font-family:monospace'>{html_mod.escape(alias_banco)}</span></div>"
        cbu_lines += "<div style='margin-top:4px;font-size:11px;color:#666'>Transferí a esta cuenta</div>"
        qr_cell = f'<div style="text-align:center">{qr_html}</div>' if qr_html else ""
        cbu_section = f'<div style="margin-top:24px;padding:16px;border:1px solid #ddd;border-radius:10px;background:#f9f9f9"><div style="font-weight:bold;margin-bottom:8px;color:#333">Datos para transferencia bancaria</div><div style="display:flex;gap:20px;align-items:center">{cbu_lines} {qr_cell}</div></div>'

    logo_url = emisor.get("logo_url", "")
    empresa = emisor.get("empresa", "")
    email_fiscal = emisor.get("email_fiscal", "")
    condiciones_venta = emisor.get("condiciones_venta", "")
    nombre_emisor = empresa or emisor.get('nombre', 'TraceLess')

    logo_html = ""
    if logo_url:
        logo_html = f'<img src="{html_mod.escape(logo_url)}" style="height:60px;object-fit:contain;margin-bottom:8px" />'

    email_section = ""
    if email_fiscal:
        email_section = f"<br>Email: {html_mod.escape(email_fiscal)}"

    condiciones_section = ""
    if condiciones_venta:
        condiciones_section = f'<div style="margin-top:20px;padding:12px;border:1px solid #ddd;border-radius:8px;background:#f9f9f9"><div style="font-weight:bold;margin-bottom:4px;font-size:12px;color:#333">Condiciones de venta</div><div style="font-size:12px;color:#555">{html_mod.escape(condiciones_venta)}</div></div>'

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8">
<title>Factura {html_mod.escape(str(factura['numero']))}</title>
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
      {logo_html}
      <h1>{html_mod.escape(nombre_emisor)}</h1>
      <div class="datos">CUIT: {html_mod.escape(emisor.get('cuit', ''))}<br>{html_mod.escape(emisor.get('direccion', ''))}{email_section}</div>
    </div>
    <div style="text-align:right">
      <h1>Factura {html_mod.escape(factura.get('tipo_nombre', 'B'))}</h1>
      <div class="datos">N° {html_mod.escape(str(factura['numero']))}<br>{html_mod.escape(str(factura['fecha']))}</div>
    </div>
  </div>
  <div class="datos">
    <strong>Cliente:</strong> {html_mod.escape(cliente.get('nombre', ''))} {html_mod.escape(cliente.get('apellido', ''))}<br>
    CUIT: {html_mod.escape(cliente.get('cuit', '-'))}<br>
    IVA: {html_mod.escape(cliente.get('condicion_iva', 'Consumidor Final'))}
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
  {cbu_section}
  {mp_section}
  {condiciones_section}
  <div class="cae">CAE: {html_mod.escape(str(factura['cae']))} — Vence: {html_mod.escape(str(factura.get('cae_vencimiento', '')))}</div>
  <div style="margin-top:30px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:10px">⚡ Facturación automática con <strong>TraceLess</strong></div>
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
    items = f.get("detalles") or []
    if items:
        return items
    desc = f.get("descripcion", "")
    if desc.startswith("{"):
        try:
            import json
            parsed = json.loads(desc)
            return [{"descripcion": i["desc"], "cantidad": i["cant"], "precio_unitario": i["precio"]} for i in parsed.get("i", [])]
        except Exception:
            return []
    return []

def _detalle_html(d):
    subt = d["cantidad"] * d["precio_unitario"]
    return f'<tr><td>{d["descripcion"]}</td><td style="text-align:center">{d["cantidad"]}</td><td style="text-align:right">${d["precio_unitario"]:,.2f}</td><td style="text-align:right">${subt:,.2f}</td></tr>'

def _default_item(f):
    desc = f.get("descripcion", "Servicios")
    extra = ""
    if desc.startswith("{"):
        try:
            import json
            parsed = json.loads(desc)
            desc = parsed.get("d", "Servicios")
            if parsed.get("r"):
                extra = '<div style="font-size:10px;color:#7c3aed;margin-top:2px">♻️ Factura recurrente</div>'
        except Exception:
            pass
    return f'<tr><td colspan="3">{desc}{extra}</td><td style="text-align:right">${f["total"]:,.2f}</td></tr>'

def generar_pdf_factura(factura: dict, cliente: dict, emisor: dict) -> bytes:
    return generar_html_factura(factura, cliente, emisor).encode("utf-8")
