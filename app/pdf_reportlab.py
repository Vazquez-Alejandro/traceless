"""
Generación de PDF profesional con reportlab (puro Python, sin dependencias nativas).
Replica el diseño del HTML de pdf.py para compatibilidad visual exacta.
"""
import io
import json
import os
import html as html_mod
import qrcode
import qrcode.constants
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    Image, KeepTogether, HRFlowable, PageBreak
)
from reportlab.lib.utils import ImageReader


# Colores corporativos TraceLess
AZUL_PRIMARY = colors.HexColor("#1a56db")
AZUL_LIGHT = colors.HexColor("#eff6ff")
GRIS_TEXTO = colors.HexColor("#374151")
GRIS_CLARO = colors.HexColor("#9ca3af")
GRIS_BORDE = colors.HexColor("#e5e7eb")
ROJO_ALERTA = colors.HexColor("#dc2626")
ROJO_FONDO = colors.HexColor("#fef2f2")
AMARILLO_ALERTA = colors.HexColor("#f59e0b")
AMARILLO_FONDO = colors.HexColor("#fffbeb")
VERDE_MP = colors.HexColor("#009ee3")
NEGRO = colors.HexColor("#111827")
BLANCO = colors.white


def _formato_monto(valor) -> str:
    """Formatea número como $X,XXX.XX"""
    try:
        return f"${float(valor):,.2f}"
    except (TypeError, ValueError):
        return "$0,00"


def _extraer_items(factura: dict) -> list:
    """Extrae items normalizados desde factura.detalles o factura.descripcion (JSON)."""
    items = factura.get("detalles") or []
    if items:
        return items
    desc = factura.get("descripcion", "")
    if isinstance(desc, str) and desc.startswith("{"):
        try:
            parsed = json.loads(desc)
            return [
                {"descripcion": i["desc"], "cantidad": i["cant"], "precio_unitario": i["precio"]}
                for i in parsed.get("i", [])
            ]
        except Exception:
            return []
    return []


def _es_nota_credito(tipo_nombre: str) -> bool:
    return tipo_nombre and tipo_nombre.startswith("NC")


def _generar_qr_bytes(url: str, size: int = 160) -> bytes:
    """Genera QR como bytes PNG."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").resize((size, size))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _build_styles():
    """Estilos de párrafo reutilizables."""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        'TL_Title', parent=styles['Heading1'],
        fontSize=22, leading=26, textColor=AZUL_PRIMARY,
        spaceAfter=4, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'TL_Subtitle', parent=styles['Normal'],
        fontSize=13, leading=18, textColor=GRIS_TEXTO,
        spaceAfter=2, fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'TL_Small', parent=styles['Normal'],
        fontSize=11, leading=15, textColor=GRIS_CLARO,
        spaceAfter=1, fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'TL_Table_Header', parent=styles['Normal'],
        fontSize=11, leading=14, textColor=BLANCO,
        fontName='Helvetica-Bold', alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'TL_Table_Cell', parent=styles['Normal'],
        fontSize=11, leading=15, textColor=NEGRO,
        fontName='Helvetica', alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'TL_Table_Cell_Center', parent=styles['Normal'],
        fontSize=11, leading=15, textColor=NEGRO,
        fontName='Helvetica', alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        'TL_Table_Cell_Right', parent=styles['Normal'],
        fontSize=11, leading=15, textColor=NEGRO,
        fontName='Helvetica', alignment=TA_RIGHT
    ))
    styles.add(ParagraphStyle(
        'TL_Total_Label', parent=styles['Normal'],
        fontSize=11, leading=15, textColor=NEGRO,
        fontName='Helvetica', alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'TL_Total_Value', parent=styles['Normal'],
        fontSize=11, leading=15, textColor=NEGRO,
        fontName='Helvetica-Bold', alignment=TA_RIGHT
    ))
    styles.add(ParagraphStyle(
        'TL_Total_Final_Label', parent=styles['Normal'],
        fontSize=13, leading=17, textColor=NEGRO,
        fontName='Helvetica-Bold', alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'TL_Total_Final_Value', parent=styles['Normal'],
        fontSize=13, leading=17, textColor=NEGRO,
        fontName='Helvetica-Bold', alignment=TA_RIGHT
    ))
    styles.add(ParagraphStyle(
        'TL_CAE', parent=styles['Normal'],
        fontSize=10, leading=13, textColor=GRIS_CLARO,
        fontName='Helvetica', alignment=TA_CENTER, spaceBefore=30
    ))
    styles.add(ParagraphStyle(
        'TL_Warning_Title', parent=styles['Normal'],
        fontSize=12, leading=16, textColor=ROJO_ALERTA,
        fontName='Helvetica-Bold', spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        'TL_Warning_Body', parent=styles['Normal'],
        fontSize=10, leading=14, textColor=colors.HexColor("#92400e"),
        fontName='Helvetica', spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        'TL_Footer', parent=styles['Normal'],
        fontSize=9, leading=12, textColor=GRIS_CLARO,
        fontName='Helvetica', alignment=TA_CENTER, spaceBefore=20
    ))
    styles.add(ParagraphStyle(
        'TL_QR_Caption', parent=styles['Normal'],
        fontSize=8, leading=10, textColor=GRIS_CLARO,
        fontName='Helvetica', alignment=TA_CENTER, spaceBefore=4
    ))
    return styles


def generar_pdf_factura(factura: dict, cliente: dict, emisor: dict) -> bytes:
    """
    Genera el PDF de la factura/nota de crédito usando reportlab.
    Retorna bytes del PDF.
    """
    buffer = io.BytesIO()
    styles = _build_styles()
    
    # Configuración del documento
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=15*mm,
        bottomMargin=15*mm,
        title=f"Factura {factura.get('numero', 'sin-numero')}",
        author="TraceLess",
    )
    
    story = []
    story_append = story.append
    
    # --- Datos base ---
    tipo_nombre = factura.get("tipo_nombre", "B")
    es_nc = _es_nota_credito(tipo_nombre)
    label_titulo = f"Nota de crédito {tipo_nombre}" if es_nc else f"Factura {tipo_nombre}"
    # nombre_emisor: usar empresa si existe y no está vacía, sino nombre
    empresa = emisor.get("empresa", "")
    nombre_emisor = empresa.strip() if empresa and empresa.strip() else emisor.get("nombre", "TraceLess")
    logo_url = emisor.get("logo_url", "")
    email_fiscal = emisor.get("email_fiscal", "")
    condiciones_venta = emisor.get("condiciones_venta", "")
    mp_link = factura.get("mp_link", "")
    factura_id = str(factura.get("id", ""))
    cbu = emisor.get("cbu", "") or ""
    alias_banco = emisor.get("alias_banco", "") or ""
    
    # --- HEADER: Logo + Emisor (izq) | Tipo + Número/Fecha (der) ---
    header_data = []
    
    # Columna izquierda: logo + emisor
    left_elems = []
    if logo_url and logo_url.strip():
        try:
            left_elems.append(Image(logo_url.strip(), width=50*mm, height=20*mm))
        except Exception:
            pass
    left_elems.append(Paragraph(html_mod.escape(nombre_emisor), styles['TL_Title']))
    
    emisor_lines = [
        f"CUIT: {html_mod.escape(emisor.get('cuit', ''))}",
        html_mod.escape(emisor.get('condicion_iva', 'Responsable Inscripto')),
        html_mod.escape(emisor.get('direccion', '')),
    ]
    if email_fiscal:
        emisor_lines.append(f"Email: {html_mod.escape(email_fiscal)}")
    left_elems.append(Paragraph("<br/>".join(emisor_lines), styles['TL_Subtitle']))
    
    # Columna derecha: tipo + número/fecha
    right_elems = [
        Paragraph(label_titulo, styles['TL_Title']),
        Paragraph(f"N° {html_mod.escape(str(factura['numero']))}<br/>{html_mod.escape(str(factura['fecha']))}", styles['TL_Subtitle']),
    ]
    
    header_table = Table(
        [[left_elems, right_elems]],
        colWidths=[doc.width * 0.6, doc.width * 0.4],
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story_append(header_table)
    story_append(Spacer(1, 8*mm))
    
    # --- Cliente ---
    cliente_lines = [
        f"<b>Cliente:</b> {html_mod.escape(cliente.get('nombre', ''))} {html_mod.escape(cliente.get('apellido', ''))}",
        f"CUIT: {html_mod.escape(cliente.get('cuit', '-'))}",
        f"IVA: {html_mod.escape(cliente.get('condicion_iva', 'Consumidor Final'))}",
    ]
    story_append(Paragraph("<br/>".join(cliente_lines), styles['TL_Subtitle']))
    story_append(Spacer(1, 6*mm))
    
    # --- TABLA DE ITEMS ---
    items = _extraer_items(factura)
    if not items:
        # Item por defecto desde factura total
        desc = factura.get("descripcion", "Servicios")
        if isinstance(desc, str) and desc.startswith("{"):
            try:
                parsed = json.loads(desc)
                desc = parsed.get("d", "Servicios")
            except Exception:
                pass
        items = [{"descripcion": desc, "cantidad": 1, "precio_unitario": factura.get("total", 0)}]
    
    # Headers
    table_data = [
        [
            Paragraph("Descripción", styles['TL_Table_Header']),
            Paragraph("Cant.", styles['TL_Table_Header']),
            Paragraph("P.Unit", styles['TL_Table_Header']),
            Paragraph("Importe", styles['TL_Table_Header']),
        ]
    ]
    
    for item in items:
        desc = html_mod.escape(str(item.get("descripcion", "")))
        cant = item.get("cantidad", 1)
        precio = float(item.get("precio_unitario", 0))
        subtotal = cant * precio
        
        table_data.append([
            Paragraph(desc, styles['TL_Table_Cell']),
            Paragraph(str(cant), styles['TL_Table_Cell_Center']),
            Paragraph(f"${precio:,.2f}", styles['TL_Table_Cell_Right']),
            Paragraph(f"${subtotal:,.2f}", styles['TL_Table_Cell_Right']),
        ])
    
    items_table = Table(
        table_data,
        colWidths=[doc.width * 0.5, doc.width * 0.12, doc.width * 0.19, doc.width * 0.19],
        repeatRows=1,
    )
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), AZUL_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), BLANCO),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [BLANCO, AZUL_LIGHT]),
    ]))
    story_append(items_table)
    story_append(Spacer(1, 6*mm))
    
    # --- TOTALES (tabla derecha) ---
    neto = float(factura.get("neto", factura.get("total", 0)))
    iva = float(factura.get("iva", 0))
    total = float(factura.get("total", 0))
    
    totales_data = [
        [Paragraph("Neto", styles['TL_Total_Label']), Paragraph(_formato_monto(neto), styles['TL_Total_Value'])],
        [Paragraph("IVA", styles['TL_Total_Label']), Paragraph(_formato_monto(iva), styles['TL_Total_Value'])],
        [Paragraph("Total", styles['TL_Total_Final_Label']), Paragraph(_formato_monto(total), styles['TL_Total_Final_Value'])],
    ]
    
    totales_table = Table(
        totales_data,
        colWidths=[doc.width * 0.6, doc.width * 0.19],  # ancho total = 280px aprox
        hAlign='RIGHT',
    )
    totales_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, GRIS_BORDE),
        ('LINEABOVE', (0, -1), (-1, -1), 2, NEGRO),
        ('TOPPADDING', (0, -1), (-1, -1), 8),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 13),
    ]))
    story_append(totales_table)
    story_append(Spacer(1, 6*mm))
    
    # --- BOTÓN MERCADOPAGO (si hay link) ---
    if mp_link:
        mp_style = ParagraphStyle(
            'TL_MP', parent=styles['Normal'],
            fontSize=13, leading=18, textColor=BLANCO,
            fontName='Helvetica-Bold', alignment=TA_CENTER,
            backColor=VERDE_MP, borderPadding=12,
            borderRadius=8, spaceBefore=8, spaceAfter=8
        )
        # reportlab no soporta botones clickeables en PDF simple, mostramos el link
        story_append(Paragraph(
            f'<link href="{html_mod.escape(mp_link)}" color="white"><b>💳 Pagar con MercadoPago</b></link>',
            ParagraphStyle('TL_MP_Link', parent=mp_style, textColor=BLANCO)
        ))
        story_append(Spacer(1, 4*mm))
    
    # --- QR DE PAGO ---
    qr_url = mp_link.strip() if mp_link else ""
    if not qr_url and factura_id:
        qr_url = f"https://www.traceless.com.ar/api/facturas/{factura_id}/public"
    if not qr_url and (cbu or alias_banco):
        # Fallback texto plano
        qr_lines = []
        if cbu:
            qr_lines.append(f"CBU: {cbu}")
        if alias_banco:
            qr_lines.append(f"Alias: {alias_banco}")
        qr_lines.append(f"Monto: {_formato_monto(total)}")
        qr_lines.append(f"Beneficiario: {nombre_emisor}")
        qr_url = "\n".join(qr_lines)
    
    if qr_url:
        try:
            qr_bytes = _generar_qr_bytes(qr_url, size=140)
            qr_img = Image(io.BytesIO(qr_bytes), width=35*mm, height=35*mm)
            qr_table = Table([[qr_img], [Paragraph("Escaneá para pagar", styles['TL_QR_Caption'])]])
            qr_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (0, 0), 4),
                ('BOTTOMPADDING', (0, 1), (0, 1), 4),
            ]))
            story_append(Spacer(1, 4*mm))
            story_append(qr_table)
            story_append(Spacer(1, 4*mm))
        except Exception:
            pass
    
    # --- CONDICIONES DE VENTA ---
    if condiciones_venta:
        cond_style = ParagraphStyle(
            'TL_Cond', parent=styles['Normal'],
            fontSize=10, leading=14, textColor=colors.HexColor("#555"),
            fontName='Helvetica', backColor=colors.HexColor("#f9f9f9"),
            borderPadding=10, borderWidth=0.5, borderColor=GRIS_BORDE,
            borderRadius=6, spaceBefore=8, spaceAfter=8
        )
        story_append(Paragraph(
            f"<b>Condiciones de venta</b><br/>{html_mod.escape(condiciones_venta)}",
            cond_style
        ))
        story_append(Spacer(1, 4*mm))
    
    # --- CAE / PREVIEW / SIN CAE ---
    if factura.get("preview"):
        cae_style = ParagraphStyle(
            'TL_Preview', parent=styles['Normal'],
            fontSize=11, leading=15, textColor=AMARILLO_ALERTA,
            fontName='Helvetica-Bold', backColor=AMARILLO_FONDO,
            borderPadding=12, borderWidth=1, borderColor=AMARILLO_ALERTA,
            borderRadius=6, alignment=TA_CENTER, spaceBefore=12, spaceAfter=12
        )
        story_append(Paragraph(
            "VISTA PREVIA — FACTURA NO EMITIDA<br/>"
            "Este es un borrador: el número y el CAE se asignarán recién al emitir.",
            cae_style
        ))
    elif factura.get("cae"):
        cae_text = f"CAE: {html_mod.escape(str(factura['cae']))} — Vence: {html_mod.escape(str(factura.get('cae_vencimiento', '')))}"
        story_append(Paragraph(cae_text, styles['TL_CAE']))
    else:
        sin_cae_style = ParagraphStyle(
            'TL_SinCAE', parent=styles['Normal'],
            fontSize=11, leading=15, textColor=ROJO_ALERTA,
            fontName='Helvetica-Bold', backColor=ROJO_FONDO,
            borderPadding=12, borderWidth=2, borderColor=ROJO_ALERTA,
            borderRadius=6, alignment=TA_CENTER, spaceBefore=12, spaceAfter=12
        )
        story_append(Paragraph(
            "<b>COMPROBANTE SIN CAE</b><br/>"
            "Este documento NO es una factura electrónica válida ante AFIP: "
            "no posee CAE ni constancia de la autoridad fiscal. "
            "Se entrega como comprobante de la operación.",
            sin_cae_style
        ))
    
    # --- CAJA VERIFICÁ ANTES DE TRANSFERIR ---
    verify_lines = [
        f"<b>Titular:</b> {html_mod.escape(nombre_emisor)}",
    ]
    if cbu:
        verify_lines.append(f"<b>CBU:</b> {html_mod.escape(cbu)}")
    if alias_banco:
        verify_lines.append(f"<b>Alias:</b> {html_mod.escape(alias_banco)}")
    verify_lines.append(f"<b>Monto:</b> {_formato_monto(total)}")
    verify_lines.append(f"<b>CUIT:</b> {html_mod.escape(emisor.get('cuit', ''))}")
    
    verify_style = ParagraphStyle(
        'TL_Verify', parent=styles['Normal'],
        fontSize=10, leading=14, textColor=colors.HexColor("#92400e"),
        fontName='Helvetica', backColor=AMARILLO_FONDO,
        borderPadding=12, borderWidth=2, borderColor=AMARILLO_ALERTA,
        borderRadius=8, spaceBefore=12, spaceAfter=12
    )
    story_append(Paragraph(
        "<b>⚠️ Verificá antes de transferir</b><br/>" + "<br/>".join(verify_lines),
        verify_style
    ))
    
    # --- FOOTER ---
    story_append(Spacer(1, 10*mm))
    story_append(HRFlowable(width="100%", thickness=0.5, color=GRIS_BORDE, spaceAfter=6, spaceBefore=6))
    story_append(Paragraph(
        "⚡ Facturación automática con <b>TraceLess</b>",
        styles['TL_Footer']
    ))
    
    # Build
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


# Para compatibilidad: genera HTML (usa la función original)
import html as html_mod
from .pdf import generar_html_factura as _generar_html_factura_original

def generar_html_factura(factura: dict, cliente: dict, emisor: dict, preview: bool = False) -> str:
    return _generar_html_factura_original(factura, cliente, emisor, preview)


def guardar_factura_html(factura: dict, cliente: dict, emisor: dict) -> str:
    from pathlib import Path
    import tempfile
    FACTURAS_DIR = Path(tempfile.gettempdir()) / "traceless_facturas"
    FACTURAS_DIR.mkdir(parents=True, exist_ok=True)
    html = generar_html_factura(factura, cliente, emisor)
    filename = f"factura-{factura['id']}.html"
    path = FACTURAS_DIR / filename
    path.write_text(html, encoding="utf-8")
    return f"/facturas/{filename}"