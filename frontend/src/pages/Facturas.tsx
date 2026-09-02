import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { leerExcel, descargarExcel } from "../lib/excel";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  telefono?: string;
}

interface Factura {
  id: string;
  numero: string;
  tipo: number;
  total: number;
  fecha: string;
  vencimiento: string;
  fecha_pago?: string;
  estado: string;
  descripcion?: string;
  clientes: Cliente;
  pdf_url?: string;
  mp_link?: string;
  scheduled_send?: string;
  es_fiscal?: boolean;
}

interface DetalleItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

const PAGE_SIZE = 20;

export default function Facturas() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [total, setTotal] = useState(0);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "", modo: "fiscal" });
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const [usarItems, setUsarItems] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [toast, setToast] = useState("");
  const [ultimoLink, setUltimoLink] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [cliForm, setCliForm] = useState({ nombre: "", apellido: "", telefono: "", cuit: "" });
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<{ invoices_limit: number | null; invoices_used: number; features: { recurrentes: boolean; analytics: boolean }; whatsapp_configurado?: boolean; whatsapp_limit?: number; whatsapp_used?: number; whatsapp_extra_cost?: number; creditos?: number; cbu?: string; alias_banco?: string; arca_configurado?: boolean }>({ invoices_limit: 5, invoices_used: 0, features: { recurrentes: false, analytics: false } });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCanal, setBulkCanal] = useState<"whatsapp" | "email" | "both">("whatsapp");

  const [filterCliente, setFilterCliente] = useState("");
  const [userLoaded, setUserLoaded] = useState(false);
  const [preview, setPreview] = useState<{ open: boolean; loading: boolean; html: string }>({ open: false, loading: false, html: "" });
  const [filterEstado, setFilterEstado] = useState("");
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ncModal, setNcModal] = useState<{ open: boolean; factura: Factura | null; motivo: string; importe: string; loading: boolean }>({ open: false, factura: null, motivo: "", importe: "", loading: false });
  const [refModal, setRefModal] = useState<{ open: boolean; factura: Factura | null; metodo: string; referencia: string; importe: string; notas: string; loading: boolean }>({ open: false, factura: null, metodo: "transferencia", referencia: "", importe: "", notas: "", loading: false });
  const [importModal, setImportModal] = useState<{ open: boolean; items: any[]; loading: boolean; results: any[] | null }>({ open: false, items: [], loading: false, results: null });
  const [importClientesModal, setImportClientesModal] = useState<{ open: boolean; items: any[]; loading: boolean; results: any[] | null }>({ open: false, items: [], loading: false, results: null });
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [tab, setTab] = useState<"facturas" | "cola">("facturas");
  const fileRef = useRef<HTMLInputElement>(null);
  const fileClientesRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (reset = true) => {
    const newOffset = reset ? 0 : offset;
    if (reset) setOffset(0);
    const filters: { cliente_id?: string; estado?: string; por_cobrar?: boolean } = {};
    if (filterCliente) filters.cliente_id = filterCliente;
    if (filterEstado === "por_cobrar") {
      filters.por_cobrar = true;
    } else if (filterEstado) {
      filters.estado = filterEstado;
    }
    const res = await api.facturas.list(PAGE_SIZE, newOffset, filters);
    if (reset) {
      setFacturas(res.facturas || []);
    } else {
      setFacturas(prev => [...prev, ...(res.facturas || [])]);
    }
    setTotal(res.total || 0);
  }, [filterCliente, filterEstado, offset]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    const filters: { cliente_id?: string; estado?: string; por_cobrar?: boolean } = {};
    if (filterCliente) filters.cliente_id = filterCliente;
    if (filterEstado === "por_cobrar") {
      filters.por_cobrar = true;
    } else if (filterEstado) {
      filters.estado = filterEstado;
    }
    const res = await api.facturas.list(PAGE_SIZE, nextOffset, filters);
    setFacturas(prev => [...prev, ...(res.facturas || [])]);
    setTotal(res.total || 0);
    setLoadingMore(false);
  };

  useEffect(() => {
    load(true);
  }, [filterCliente, filterEstado]);

  useEffect(() => {
    api.clientes.list(100, 0).then(res => setClientes(res.clientes || []));
    api.auth.me().then(res => {
      if (res.user) setUserPlan({ invoices_limit: res.user.invoices_limit, invoices_used: res.user.invoices_used, features: res.user.features || { recurrentes: false, analytics: false }, whatsapp_configurado: res.user.whatsapp_configurado, whatsapp_limit: res.user.whatsapp_limit, whatsapp_used: res.user.whatsapp_used, whatsapp_extra_cost: res.user.whatsapp_extra_cost, creditos: res.user.creditos, cbu: res.user.cbu, alias_banco: res.user.alias_banco, arca_configurado: res.user.arca_configurado });
      setUserLoaded(true);
    });
    // Cargar facturas pendientes de reintento
    const t = localStorage.getItem("token");
    if (t) {
      fetch(`${BASE_URL}/api/retry/pending`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(d => setPendientes(d.pendientes || []))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleCancel = async (id: string) => {
    if (!confirm("¿Estás seguro de anular esta factura? No se puede deshacer.")) return;
    try {
      await fetch(`/api/facturas/${id}/anular`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setToast("Factura anulada correctamente");
      load(true);
    } catch {
      alert("Error al anular la factura");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta factura programada?")) return;
    try {
      await api.facturas.delete(id);
      setToast("Factura eliminada");
      load(true);
    } catch {
      alert("Error al eliminar la factura");
    }
  };

  const handlePay = async (id: string) => {
    try {
      await fetch(`/api/facturas/${id}/pagar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setToast("Factura marcada como pagada");
      load(true);
    } catch {
      alert("Error al marcar como pagada");
    }
  };

  const handleMarkSent = async (id: string) => {
    try {
      await fetch(`/api/facturas/${id}/marcar-enviada`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setToast("Factura marcada como enviada");
      load(true);
    } catch {
      alert("Error al marcar como enviada");
    }
  };

  const handleShare = async (facturaId: string) => {
    const url = `${window.location.origin}/api/facturas/${facturaId}/public`;
    await navigator.clipboard.writeText(url);
    setCopiado(facturaId);
    setToast("Link de factura copiado al portapapeles");
    setTimeout(() => setCopiado(""), 2000);
  };

  const handleWhatsApp = async (f: Factura) => {
    // Planes pagos: intento Cloud API directo; Gratis o sin créditos: fallback wa.me
    const isFree = !userPlan.whatsapp_configurado || userPlan.whatsapp_limit === 0 || userPlan.whatsapp_limit === null;
    if (!isFree) {
      if (!confirm(`¿Deseás enviar la factura ${f.numero} por WhatsApp a ${f.clientes?.nombre || ""} ${f.clientes?.apellido || ""}?`)) return;
      try {
        const res = await fetch(`/api/facturas/enviar-whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: JSON.stringify({ factura_ids: [f.id], canal: "whatsapp" }),
        }).then(r => r.json());
        if (res.enviados > 0 || res.enviados_email?.length > 0) {
          setToast(`✅ Enviada por WhatsApp a ${f.clientes?.nombre || "cliente"}`);
          load(true);
          return;
        }
        if (res.fallback_wa_me_ids?.length > 0) {
          // Sin créditos: ofrecer comprar o wa.me
          if (confirm(`Te quedaste sin mensajes incluidos (${userPlan.whatsapp_used}/${userPlan.whatsapp_limit}). ¿Comprar más o enviar por wa.me gratis?`)) {
            window.location.href = "/perfil";
            return;
          }
        } else if (res.errores?.length > 0) {
          setToast(`⚠️ ${res.errores[0]?.error || "Error al enviar"}`);
          return;
        }
      } catch {}
    }
    // Fallback wa.me (Gratis o sin saldo)
    const telefono = f.clientes?.telefono?.replace(/[^0-9]/g, "") || "";
    const url = `${window.location.origin}/api/facturas/${f.id}/public`;
    const msg = encodeURIComponent(`Hola ${f.clientes?.nombre}, te envío la factura ${f.numero} por $${f.total.toLocaleString()}. Podés verla acá: ${url}\n\n⚡ Facturación automática con TraceLess`);
    const waUrl = telefono ? `https://wa.me/54${telefono}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
  };

  const handleClone = (f: Factura) => {
    let desc = "Honorarios";
    try {
      const parsed = JSON.parse(f.descripcion || "");
      desc = parsed.d || "Honorarios";
    } catch {
      desc = f.descripcion || "Honorarios";
    }
    setForm({
      cliente_id: f.clientes?.id || "",
      tipo: f.tipo,
      importe: String(f.total),
      descripcion: desc,
      recurrente: false,
      scheduled_send: "",
      modo: "fiscal",
    });
    setDetalles([]);
    setUsarItems(false);
    setShowForm(true);
    setToast("Datos copiados. Modificá lo que necesites y emití.");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await leerExcel(file);

      const mapped = rows.map((row: any) => {
        const find = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(row).find(col => col.toLowerCase().trim() === k);
            if (found && row[found]) return String(row[found]).trim();
          }
          return "";
        };
        const tipoStr = find(["tipo", "type", "comprobante"]).toUpperCase();
        let tipo = 11;
        if (tipoStr === "A" || tipoStr === "FACTURA A") tipo = 1;
        else if (tipoStr === "B" || tipoStr === "FACTURA B") tipo = 6;
        else if (tipoStr === "C" || tipoStr === "FACTURA C") tipo = 11;
        else if (tipoStr === "E" || tipoStr === "FACTURA E") tipo = 19;

        return {
          cliente_cuit: find(["cuit", "documento", "dni", "rut", "rif"]),
          cliente_nombre: find(["cliente", "nombre", "name", "razon_social"]),
          tipo,
          importe: parseFloat(find(["importe", "total", "monto", "amount"]) || "0") || 0,
          descripcion: find(["descripcion", "description", "detalle", "concepto"]) || "Honorarios",
          fecha: find(["fecha", "date"]) || "",
        };
      }).filter((item: any) => item.cliente_cuit && item.importe > 0);

      if (mapped.length === 0) {
        setToast("No se encontraron facturas válidas (se necesita CUIT e importe)");
        return;
      }
      setImportModal({ open: true, items: mapped, loading: false, results: null });
    } catch (err: any) {
      setToast("Error al leer el archivo: " + (err.message || "desconocido"));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    setImportModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.facturas.import(importModal.items);
      setImportModal(prev => ({ ...prev, loading: false, results: res.resultados }));
      setToast(`Importación completada: ${res.exitosos} éxitos, ${res.fallidos} fallos`);
      load(true);
    } catch (err: any) {
      setImportModal(prev => ({ ...prev, loading: false }));
      setToast("Error al importar: " + (err.message || "desconocido"));
    }
  };

  const handleImportClientesExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await leerExcel(file);

      const mapped = rows.map((row: any) => {
        const find = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(row).find(col => col.toLowerCase().trim() === k);
            if (found && row[found]) return String(row[found]).trim();
          }
          return "";
        };

        return {
          nombre: find(["nombre", "name", "first_name"]),
          apellido: find(["apellido", "last_name"]),
          telefono: find(["telefono", "whatsapp", "phone", "celular", "movil"]),
          cuit: find(["cuit", "documento", "dni", "rut", "rif"]),
          email: find(["email", "e-mail", "mail", "correo"]),
          direccion: find(["direccion", "address", "domicilio"]),
          condicion_iva: find(["condicion_iva", "iva", "condicion", "tipo_iva"]) || "Consumidor Final",
        };
      }).filter((item: any) => item.nombre && item.cuit);

      if (mapped.length === 0) {
        setToast("No se encontraron clientes válidos (se necesita nombre y CUIT)");
        return;
      }
      setImportClientesModal({ open: true, items: mapped, loading: false, results: null });
    } catch (err: any) {
      setToast("Error al leer el archivo: " + (err.message || "desconocido"));
    }
    if (fileClientesRef.current) fileClientesRef.current.value = "";
  };

  const handleConfirmImportClientes = async () => {
    setImportClientesModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.clientes.import(importClientesModal.items);
      setImportClientesModal(prev => ({ ...prev, loading: false, results: res.resultados }));
      setToast(`Clientes importados: ${res.exitosos} éxitos, ${res.fallidos} fallos`);
      const list = await api.clientes.list(100, 0);
      setClientes(list.clientes || []);
    } catch (err: any) {
      setImportClientesModal(prev => ({ ...prev, loading: false }));
      setToast("Error al importar clientes: " + (err.message || "desconocido"));
    }
  };

  const openNcModal = (f: Factura) => {
    setNcModal({ open: true, factura: f, motivo: "Anulación total", importe: String(f.total), loading: false });
  };

  const handleCrearNc = async () => {
    if (!ncModal.factura || !ncModal.motivo) return;
    setNcModal({ ...ncModal, loading: true });
    try {
      const res = await api.facturas.notaCredito({
        factura_original_id: ncModal.factura.id,
        motivo: ncModal.motivo,
        importe: ncModal.importe ? parseFloat(ncModal.importe) : undefined,
      });
      setToast(res.mensaje || "Nota de crédito emitida");
      setNcModal({ open: false, factura: null, motivo: "", importe: "", loading: false });
      load(true);
    } catch (err: any) {
      setToast("Error: " + (err.message || "No se pudo emitir la nota de crédito"));
      setNcModal({ ...ncModal, loading: false });
    }
  };

  const openRefModal = async (f: Factura) => {
    try {
      const res = await api.reembolsos.resumen(f.id);
      const pendiente = res.saldo_pendiente || f.total;
      setRefModal({ open: true, factura: f, metodo: "transferencia", referencia: "", importe: String(pendiente > 0 ? pendiente.toFixed(2) : "0"), notas: "", loading: false });
    } catch {
      setRefModal({ open: true, factura: f, metodo: "transferencia", referencia: "", importe: String(f.total), notas: "", loading: false });
    }
  };

  const handleCrearReembolso = async () => {
    if (!refModal.factura || !refModal.importe || parseFloat(refModal.importe) <= 0) return;
    setRefModal({ ...refModal, loading: true });
    try {
      await api.reembolsos.create({
        factura_id: refModal.factura.id,
        monto: parseFloat(refModal.importe),
        metodo: refModal.metodo,
        referencia: refModal.referencia,
        notas: refModal.notas,
      });
      setToast("Reembolso registrado ✅");
      setRefModal({ open: false, factura: null, metodo: "transferencia", referencia: "", importe: "", notas: "", loading: false });
      load(true);
    } catch (err: any) {
      setToast("Error: " + (err.message || "No se pudo registrar el reembolso"));
      setRefModal({ ...refModal, loading: false });
    }
  };

  const handleEditFactura = (f: Factura) => {
    let desc = "Honorarios";
    let hasItems = false;
    try {
      const parsed = JSON.parse(f.descripcion || "");
      desc = parsed.d || "Honorarios";
      if (parsed.i && parsed.i.length > 0) {
        hasItems = true;
        setDetalles(parsed.i.map((it: any) => ({
          descripcion: it.desc || "",
          cantidad: it.cant || 1,
          precio_unitario: it.precio || 0,
        })));
      }
    } catch {
      desc = f.descripcion || "Honorarios";
      setDetalles([]);
    }
    setForm({
      cliente_id: f.clientes?.id || "",
      tipo: f.tipo,
      importe: String(f.total),
      descripcion: desc,
      recurrente: false,
      scheduled_send: f.scheduled_send || "",
      modo: "fiscal",
    });
    setUsarItems(hasItems);
    setEditingId(f.id);
    setShowForm(true);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === facturas.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(facturas.map(f => f.id)));
    }
  };

  const handleBulkWhatsApp = async () => {
    const seleccionadas = facturas.filter(f => selected.has(f.id));
    if (seleccionadas.length === 0) return;
    const canalLabel = bulkCanal === "email" ? "por Email" : bulkCanal === "both" ? "por WhatsApp y Email" : "por WhatsApp";
    if (!confirm(`¿Deseás enviar ${seleccionadas.length} factura(s) ${canalLabel}?\n\n${seleccionadas.map(f => `• ${f.numero} — ${f.clientes?.nombre || ""} $${f.total.toLocaleString()}`).join("\n")}`)) return;

    try {
      const res = await fetch(`/api/facturas/enviar-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ factura_ids: seleccionadas.map(f => f.id), canal: bulkCanal }),
      }).then(r => r.json());

      const parts: string[] = [];
      if (res.enviados > 0) parts.push(`${res.enviados} factura(s) enviada(s)`);
      if (res.enviados_email?.length > 0) parts.push(`📧 ${res.enviados_email.length} por email`);
      if (res.fallback_wa_me_ids?.length > 0) parts.push(`📱 ${res.fallback_wa_me_ids.length} por wa.me`);
      if (res.errores?.length > 0) parts.push(`⚠️ ${res.errores.length} error(es)`);
      if (parts.length > 0) setToast(parts.join(" · "));

      setSelected(new Set());
      load(true);
    } catch {
      setToast("Error al enviar");
    }
  };

  const addItem = () => {
    setDetalles([...detalles, { descripcion: "", cantidad: 1, precio_unitario: 0 }]);
  };

  const updateItem = (i: number, field: keyof DetalleItem, value: string | number) => {
    const items = [...detalles];
    (items[i] as any)[field] = value;
    setDetalles(items);
  };

  const removeItem = (i: number) => {
    setDetalles(detalles.filter((_, idx) => idx !== i));
  };

  const totalItems = detalles.reduce((s, d) => s + d.cantidad * d.precio_unitario, 0);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id) { setToast("Seleccioná un cliente"); setTimeout(() => setToast(""), 4000); return; }
    setPreview({ open: true, loading: true, html: "" });
    try {
      const body: any = { ...form, importe: usarItems ? totalItems : parseFloat(form.importe || "0"), tipo: form.tipo };
      if (usarItems) body.detalles = detalles.filter(d => d.descripcion && d.precio_unitario > 0);
      const res = await api.facturas.preview(body);
      setPreview({ open: true, loading: false, html: res?.html || "<p>No se pudo generar la vista previa.</p>" });
    } catch (err: any) {
      setPreview({ open: false, loading: false, html: "" });
      setToast("Error: " + (err.message || "No se pudo previsualizar"));
      setTimeout(() => setToast(""), 5000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      const body: any = {};
      if (form.cliente_id) body.cliente_id = form.cliente_id;
      if (form.tipo) body.tipo = form.tipo;
      if (form.descripcion) body.descripcion = form.descripcion;
      if (usarItems) body.importe = totalItems;
      else if (form.importe) body.importe = parseFloat(form.importe);
      if (form.scheduled_send !== undefined) body.scheduled_send = form.scheduled_send || null;
      try {
        await api.facturas.update(editingId, body);
        setToast("Factura actualizada");
        setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "", modo: "fiscal" });
        setDetalles([]);
        setUsarItems(false);
        setEditingId(null);
        setShowForm(false);
        load(true);
      } catch (err: any) {
        setToast("Error: " + (err.message || "No se pudo actualizar"));
      }
      setLoading(false);
      return;
    }

    const body: any = { ...form, importe: usarItems ? totalItems : parseFloat(form.importe), tipo: form.tipo, scheduled_send: form.scheduled_send || undefined, canal: "whatsapp" };
    if (usarItems) {
      body.detalles = detalles.filter(d => d.descripcion && d.precio_unitario > 0);
    }
    let res;
    try {
      res = await api.facturas.create(body);
    } catch (err: any) {
      setToast("Error: " + (err.message || "No se pudo emitir la factura"));
      setTimeout(() => setToast(""), 5000);
      setLoading(false);
      return;
    }
    if (res.error) {
      setToast("Error: " + res.error);
      setTimeout(() => setToast(""), 5000);
      setLoading(false);
      return;
    }
    if (res.pendiente) {
      setToast("⏳ " + (res.mensaje || "ARCA no respondió. Tu factura está en cola."));
      setTimeout(() => setToast(""), 10000);
      setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "", modo: "fiscal" });
      setDetalles([]);
      setUsarItems(false);
      setShowForm(false);
      setLoading(false);
      load(true);
      return;
    }
    const id = res?.factura?.id;
    const link = id ? `${window.location.origin}/api/facturas/${id}/public` : "";
    setUltimoLink(link);

    if (res.fallback_wa_me) {
      setToast("📱 Sin créditos API. Se abrió wa.me para enviar gratis");
    } else if (res.enviado_por === "email") {
      setToast("📧 Factura enviada por email");
    } else if (res.enviado_por === "whatsapp_api") {
      setToast("✅ Factura enviada por WhatsApp API");
    } else {
      setToast(res?.factura?.es_fiscal === false ? "Comprobante simple creado (sin CAE) - Compartilo con tu cliente" : "Factura creada ✅ Compartila con tu cliente");
    }

    setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "", modo: "fiscal" });
    setDetalles([]);
    setUsarItems(false);
    setShowForm(false);
    setLoading(false);
    load(true);
  };

  const crearClienteRapido = async () => {
    if (!cliForm.nombre) return;
    setLoading(true);
    const res = await api.clientes.create(cliForm);
    if (res.error) {
      setToast("Error al crear cliente: " + res.error);
      setLoading(false);
      return;
    }
    const nuevo = res.cliente;
    setNuevoCliente(false);
    setCliForm({ nombre: "", apellido: "", telefono: "", cuit: "" });
    const list = await api.clientes.list(100, 0);
    setClientes(list.clientes || []);
    if (nuevo?.id) {
      setForm({ ...form, cliente_id: nuevo.id });
      setToast("Cliente creado y seleccionado ✅");
    }
    setLoading(false);
    setTimeout(() => setToast(""), 3000);
  };

  const hasMore = facturas.length < total;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold">Facturas</h1>
          {userPlan.invoices_limit !== null && (
            <p className="text-xs text-gray-500 mt-1">
              {userPlan.invoices_limit - userPlan.invoices_used > 0
                ? `${userPlan.invoices_used}/${userPlan.invoices_limit} facturas este mes`
                : `Límite de ${userPlan.invoices_limit} facturas alcanzado. `}
              {userPlan.invoices_limit - userPlan.invoices_used <= 0 && (
                <Link to="/perfil" className="text-blue-400 hover:underline">Actualizá tu plan</Link>
              )}
              {userPlan.whatsapp_limit !== undefined && userPlan.whatsapp_limit > 0 && (
                <span className="ml-2">· {userPlan.whatsapp_used}/{userPlan.whatsapp_limit} msgs WhatsApp</span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:justify-end">
          <button onClick={async () => {
            const t = localStorage.getItem("token");
            const res = await fetch('/api/facturas/export', { headers: { Authorization: `Bearer ${t}` } });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          }} className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap">
            Exportar Excel
          </button>
          <button onClick={() => {
            descargarExcel("template_facturas.xlsx", "Facturas",
              ["cliente_cuit", "cliente_nombre", "tipo", "importe", "descripcion", "fecha"],
              [["20300000000", "Juan Pérez", 11, 1000, "Honorarios", "2026-08-05"]]
            );
          }} className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap">
            Descargar template
          </button>
          <button onClick={() => fileRef.current?.click()} className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap">
            Importar Excel
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportExcel} className="hidden" />
          <button onClick={() => {
            if (userPlan.invoices_limit !== null && userPlan.invoices_used >= userPlan.invoices_limit) {
              setToast(`Límite de ${userPlan.invoices_limit} facturas/mes alcanzado. Actualizá tu plan para seguir facturando.`);
              return;
            }
            setEditingId(null); setShowForm(!showForm); setDetalles([]); setUsarItems(false);
          }} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap">
            {showForm ? "Cancelar" : "+ Nueva Factura"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-800">
        <button onClick={() => setTab("facturas")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "facturas" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
          Facturas ({total})
        </button>
        {pendientes.length > 0 && (
          <button onClick={() => setTab("cola")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "cola" ? "border-amber-500 text-amber-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            En cola ({pendientes.length})
          </button>
        )}
      </div>

      {tab === "cola" && pendientes.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs text-gray-500 mb-3">Estas facturas se reintentan automáticamente. ARCA no respondió en el primer intento.</p>
          {pendientes.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-900/20 border border-amber-800/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                </div>
                <div>
                  <p className="text-sm text-white">{p.clientes?.nombre} {p.clientes?.apellido}</p>
                  <p className="text-xs text-gray-500">${p.importe?.toLocaleString("es-AR")} · Intento {p.intentos || 0}/5</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-400">Reintentando...</p>
                {p.ultimo_error && <p className="text-[10px] text-gray-600 max-w-[180px] truncate">{p.ultimo_error.slice(0, 50)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "facturas" && (
        <form onSubmit={handleSubmit} className="relative p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6">
          <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setDetalles([]); setUsarItems(false); setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "", modo: "fiscal" }); }} className="absolute top-3 right-3 text-gray-500 hover:text-white p-1" title="Cerrar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          {editingId && <p className="text-sm text-gray-400 mb-3">Editando factura</p>}
          {userLoaded && !userPlan.arca_configurado && (
            <div className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm flex flex-col gap-1">
              <strong>⚠️ Sin facturación fiscal conectada</strong>
              <span>
                Esta factura se emitirá como <strong>comprobante simple (sin CAE)</strong>. Para que reciba y envíes una{" "}
                <strong>factura fiscal válida ante AFIP</strong>, conectá tu facturación en{" "}
                <Link to="/perfil" className="underline font-semibold hover:text-amber-100">tu perfil</Link> cargando tu CUIT y certificado de ARCA.
              </span>
            </div>
          )}
          {userLoaded && userPlan.arca_configurado && (
            <div className="mb-4 p-3 rounded-xl border border-gray-800 bg-gray-900/50 flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <span className="font-medium">Tipo de comprobante:</span>
                <select value={form.modo} onChange={e => setForm({ ...form, modo: e.target.value })}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm">
                  <option value="fiscal">Factura fiscal con CAE (AFIP)</option>
                  <option value="simple">Comprobante simple (sin CAE)</option>
                </select>
              </label>
              {form.modo === "simple" && (
                <span className="text-xs text-amber-300/80">Se emitirá sin CAE, útil como presupuesto o nota de venta informal.</span>
              )}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="flex gap-2">
              <select value={form.cliente_id} onChange={async e => {
                const cid = e.target.value;
                setForm({ ...form, cliente_id: cid });
                if (cid && !editingId) {
                  try {
                    const BASE_URL = import.meta.env.VITE_API_URL || "";
                    const token = localStorage.getItem("token");
                    const res = await fetch(`${BASE_URL}/api/facturas/ultima-por-cliente/${cid}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
                    if (res.found) {
                      setForm(prev => ({
                        ...prev,
                        cliente_id: cid,
                        importe: prev.importe || String(res.total || ""),
                        descripcion: prev.descripcion === "Honorarios" ? (res.descripcion || "Honorarios") : prev.descripcion,
                      }));
                    }
                  } catch {}
                }
              }} required
                className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm">
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                ))}
              </select>
              <button type="button" onClick={() => setNuevoCliente(!nuevoCliente)} className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl">+</button>
            </div>
            {nuevoCliente && (
              <div className="flex flex-col gap-2 col-span-2 p-3 bg-gray-900/60 rounded-xl border border-gray-800/40">
                <div className="flex gap-2 flex-wrap">
                  <input placeholder="Nombre" value={cliForm.nombre} onChange={e => setCliForm({...cliForm, nombre: e.target.value})}
                    className="flex-1 min-w-[120px] px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                  <input placeholder="Apellido" value={cliForm.apellido} onChange={e => setCliForm({...cliForm, apellido: e.target.value})}
                    className="flex-1 min-w-[120px] px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                  <input placeholder="WhatsApp" value={cliForm.telefono} onChange={e => setCliForm({...cliForm, telefono: e.target.value})}
                    className="flex-1 min-w-[120px] px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                  <input placeholder="CUIT" value={cliForm.cuit} onChange={e => setCliForm({...cliForm, cuit: e.target.value})}
                    className="flex-1 min-w-[120px] px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                  <button type="button" onClick={crearClienteRapido} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg whitespace-nowrap">Crear Cliente</button>
                </div>
                <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-800/40">
                  <input ref={fileClientesRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportClientesExcel} className="hidden" />
                  <button onClick={() => fileClientesRef.current?.click()} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-xl">
                    Importar Clientes Excel
                  </button>
                  <button onClick={() => descargarExcel("template_clientes.xlsx", "Clientes",
                    ["nombre", "apellido", "telefono", "cuit", "email", "direccion", "condicion_iva"],
                    [["Juan", "Pérez", "5491155551234", "20300000000", "juan@test.com", "Av. Siempre Viva 123", "Responsable Inscripto"]]
                  )} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-xl">
                    Descargar template clientes
                  </button>
                </div>
              </div>
            )}
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: parseInt(e.target.value) })}
              className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm">
              <option value={6}>Factura B</option>
              <option value={1}>Factura A</option>
              <option value={11}>Factura C</option>
            </select>
            {!usarItems && (
              <input type="number" step="0.01" placeholder="Importe ($)" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} required={!usarItems}
                className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
            )}
            <input placeholder="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          </div>

          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={usarItems} onChange={e => setUsarItems(e.target.checked)} />
              Desglosar por items
            </label>
            {userPlan.features.recurrentes ? (
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input type="checkbox" checked={form.recurrente} onChange={e => setForm({ ...form, recurrente: e.target.checked })} />
                Factura recurrente
              </label>
            ) : (
              <span className="text-xs text-gray-600 italic">Recurrentes · <button type="button" onClick={() => window.location.href = '/perfil'} className="text-blue-400 hover:underline not-italic">Mejorá tu plan</button></span>
            )}
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={!!form.scheduled_send} onChange={e => {
                if (!e.target.checked) setForm({ ...form, scheduled_send: "" });
                else {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setForm({ ...form, scheduled_send: d.toISOString().split("T")[0] });
                }
              }} />
              Programar envío
            </label>
            {form.scheduled_send && (
              <input type="date" value={form.scheduled_send} onChange={e => setForm({ ...form, scheduled_send: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs" />
            )}
          </div>

          {usarItems && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-gray-500 mb-2">Items:</p>
              {detalles.map((d, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input placeholder="Descripción" value={d.descripcion} onChange={e => updateItem(i, "descripcion", e.target.value)}
                    onKeyDown={e => e.key === "Enter" && e.preventDefault()}
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                  <input type="number" step="1" placeholder="Cant." value={d.cantidad} onChange={e => updateItem(i, "cantidad", parseFloat(e.target.value) || 0)}
                    onKeyDown={e => e.key === "Enter" && e.preventDefault()}
                    className="w-20 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-center" />
                  <input type="number" step="0.01" placeholder="P.Unit" value={d.precio_unitario} onChange={e => updateItem(i, "precio_unitario", parseFloat(e.target.value) || 0)}
                    onKeyDown={e => e.key === "Enter" && e.preventDefault()}
                    className="w-28 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                  <span className="text-sm text-gray-400 py-2 w-20 text-right">${(d.cantidad * d.precio_unitario).toFixed(2)}</span>
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 text-sm py-2 px-2">✕</button>
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-xs text-blue-400 hover:underline">+ Agregar item</button>
              {detalles.length > 0 && (
                <p className="text-sm text-gray-300 mt-2 text-right font-semibold">Total: ${totalItems.toFixed(2)}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={handlePreview} disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm">
              👁 Vista previa
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm">
              {loading ? "Guardando..." : editingId ? "Actualizar Factura" : form.scheduled_send ? "Programar Factura" : "Emitir Factura"}
            </button>
          </div>
        </form>
      )}

      {tab === "facturas" && (<>

      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-blue-900/30 border border-blue-700/30 text-sm text-blue-200 flex items-center justify-center gap-2">
          <span>{toast}</span>
          {ultimoLink && (
            <button onClick={() => { navigator.clipboard.writeText(ultimoLink); setToast("✅ Link copiado"); }} className="text-blue-300 underline hover:text-white text-xs">
              Copiar link
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <select value={filterCliente} onChange={e => setFilterCliente(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm appearance-none cursor-pointer">
            <option value="">Todos los clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "por_cobrar", "emitida", "enviada", "pagada", "vencida", "programada", "anulada"].map(estado => {
            const labels: Record<string, string> = {
              "": "Todas",
              "por_cobrar": "Por cobrar",
              "emitida": "Emitidas",
              "enviada": "Enviadas",
              "pagada": "Pagadas",
              "vencida": "Vencidas",
              "programada": "Programadas",
              "anulada": "Anuladas"
            };
            return (
              <button key={estado} onClick={() => setFilterEstado(estado)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterEstado === estado ? "bg-blue-600 text-white" : "bg-gray-800/60 text-gray-400 hover:text-white"}`}>
                {labels[estado]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {facturas.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-gray-900/60 border border-gray-800/30">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={selected.size === facturas.length && facturas.length > 0} onChange={toggleSelectAll} className="rounded" />
                Todas ({selected.size}/{facturas.length})
              </label>
              <span className="text-[10px] text-gray-600">
                {total > 0 && `Mostrando ${facturas.length} de ${total}`}
              </span>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-gray-800/60 rounded-lg p-0.5">
                  <button onClick={() => setBulkCanal("whatsapp")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${bulkCanal === "whatsapp" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    📱 WhatsApp
                  </button>
                  <button onClick={() => setBulkCanal("email")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${bulkCanal === "email" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    📧 Email
                  </button>
                  <button onClick={() => setBulkCanal("both")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${bulkCanal === "both" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    📱📧 Ambos
                  </button>
                </div>
                <button onClick={handleBulkWhatsApp}
                  className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg ${
                    bulkCanal === "email" ? "bg-blue-600 hover:bg-blue-500" :
                    bulkCanal === "both" ? "bg-purple-600 hover:bg-purple-500" :
                    "bg-green-600 hover:bg-green-500"
                  }`}>
                  {bulkCanal === "email" ? `📧 Enviar ${selected.size} por email` :
                   bulkCanal === "both" ? `📱📧 Enviar ${selected.size} por ambos` :
                   `📱 Enviar ${selected.size} por WhatsApp`}
                </button>
              </div>
            )}
          </div>
        )}
        {facturas.map(f => (
          <div key={f.id} className={`p-4 rounded-xl bg-gray-900/40 border ${selected.has(f.id) ? "border-green-500/40 bg-green-900/10" : "border-gray-800/40"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} className="rounded flex-shrink-0 mt-1" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.numero || "—"} — ${f.total.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 truncate">{f.clientes?.nombre} {f.clientes?.apellido} · {f.fecha}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${
                      f.estado === "pagada" ? "bg-green-900/40 text-green-400" :
                      f.estado === "anulada" ? "bg-red-900/40 text-red-400" :
                      f.estado === "vencida" ? "bg-yellow-900/40 text-yellow-400" :
                      f.estado === "enviada" ? "bg-cyan-900/40 text-cyan-400" :
                      f.estado === "programada" ? "bg-purple-900/40 text-purple-400" : "bg-blue-900/40 text-blue-400"
                    }`}>
                      {f.estado === "pagada" ? "Pagada" : f.estado === "anulada" ? "Anulada" : f.estado === "vencida" ? "Vencida" : f.estado === "enviada" ? "Enviada" : f.estado === "programada" ? "Programada" : "Emitida"}
                    </span>
                    {[3, 8, 13, 21].includes(f.tipo) && (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-400 border border-orange-700/40">Nota de crédito</span>
                    )}
                    {f.es_fiscal === false && (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">Sin CAE</span>
                    )}
                    {f.scheduled_send && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">📅 {f.scheduled_send}</span>
                    )}
                    {(f as any).recurrente && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">Recurrente</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-semibold">${f.total.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">{f.vencimiento ? `Vence: ${f.vencimiento}` : ""}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/30 flex-wrap">
              {(f.estado === "programada" || f.estado === "emitida") && (
                <button onClick={() => handleEditFactura(f)} title="Editar" className="px-2 py-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-900/20 rounded-lg">Editar</button>
              )}
              <button onClick={() => handleClone(f)} title="Reemitir" className="px-2 py-1 text-[11px] text-gray-400 hover:text-white bg-gray-800/50 rounded-lg">Reemitir</button>
              {f.estado !== "programada" && (
                <button onClick={() => handleWhatsApp(f)} title="WhatsApp" className="px-2 py-1 text-[11px] text-green-400 hover:text-green-300 bg-green-900/20 rounded-lg">WhatsApp</button>
              )}
              {copiado === f.id ? (
                <span className="px-2 py-1 text-[11px] text-green-400">Copiado!</span>
              ) : (
                <button onClick={() => handleShare(f.id)} className="px-2 py-1 text-[11px] text-gray-400 hover:text-white bg-gray-800/50 rounded-lg">Copiar link</button>
              )}
              {f.estado !== "programada" && (
                <button onClick={async () => {
                  const t = localStorage.getItem("token");
                  const res = await fetch(`/api/facturas/${f.id}/pdf`, { headers: { Authorization: `Bearer ${t}` } });
                  if (!res.ok) {
                    setToast("Error generando PDF: weasyprint no disponible en servidor");
                    return;
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank");
                }} className="px-2 py-1 text-[11px] text-blue-400 hover:underline bg-blue-900/20 rounded-lg">PDF</button>
              )}
              {f.mp_link && (
                <a href={f.mp_link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-[11px] text-green-400 hover:underline bg-green-900/20 rounded-lg">Pagar</a>
              )}
              {!userPlan.cbu && !userPlan.alias_banco && (
                <Link to="/perfil" className="px-2 py-1 text-[10px] text-yellow-500 hover:text-yellow-400 bg-yellow-900/20 rounded-lg">⚙️ CBU</Link>
              )}
              {(f.estado === "emitida" || f.estado === "enviada" || f.estado === "vencida") && ![3, 8, 13, 21].includes(f.tipo) && (
                <>
                  <button onClick={() => handlePay(f.id)} className="px-2 py-1 text-[11px] text-green-400 hover:underline">Pagada</button>
                  <button onClick={() => handleCancel(f.id)} className="px-2 py-1 text-[11px] text-red-400 hover:underline">Anular</button>
                  <button onClick={() => openNcModal(f)} className="px-2 py-1 text-[11px] text-orange-400 hover:text-orange-300 bg-orange-900/20 rounded-lg">Nota de crédito</button>
                  <button onClick={() => openRefModal(f)} className="px-2 py-1 text-[11px] text-purple-400 hover:text-purple-300 bg-purple-900/20 rounded-lg">Reembolso</button>
                </>
              )}
              {f.estado === "emitida" && (
                <button onClick={() => handleMarkSent(f.id)} className="px-2 py-1 text-[11px] text-cyan-400 hover:underline">Enviada</button>
              )}
              {f.estado === "programada" && (
                <button onClick={() => handleDelete(f.id)} className="px-2 py-1 text-[11px] text-red-400 hover:underline">Eliminar</button>
              )}
            </div>
          </div>
        ))}
        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore}
            className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 bg-gray-900/40 border border-gray-800/40 rounded-xl transition-all disabled:opacity-50">
            {loadingMore ? "Cargando..." : `Cargar más (${facturas.length} de ${total})`}
          </button>
        )}
        {facturas.length === 0 && !loading && <p className="text-gray-500 text-sm text-center py-8">No hay facturas{filterCliente || filterEstado ? " con estos filtros" : " aún"}.</p>}
      </div>
      </>)}

      {ncModal.open && ncModal.factura && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setNcModal({ open: false, factura: null, motivo: "", importe: "", loading: false })}>
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nota de Crédito</h3>
              <button onClick={() => setNcModal({ open: false, factura: null, motivo: "", importe: "", loading: false })} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-gray-800/40 border border-gray-700/40 text-sm">
              <p className="text-gray-300">Factura: <span className="font-semibold">{ncModal.factura.numero}</span></p>
              <p className="text-gray-400">Cliente: {ncModal.factura.clientes?.nombre} {ncModal.factura.clientes?.apellido}</p>
              <p className="text-gray-400">Total: <span className="font-semibold text-white">${ncModal.factura.total.toLocaleString()}</span></p>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Motivo *</label>
                <select value={ncModal.motivo} onChange={e => setNcModal({ ...ncModal, motivo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm">
                  <option value="Anulación total">Anulación total</option>
                  <option value="Devolución">Devolución</option>
                  <option value="Descuento">Descuento</option>
                  <option value="Ajuste">Ajuste</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Importe (${ncModal.factura.total.toLocaleString()} = total)</label>
                <input type="number" step="0.01" value={ncModal.importe} onChange={e => setNcModal({ ...ncModal, importe: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
                <p className="text-[10px] text-gray-500 mt-1">Dejar vacío = monto total. Solo podés emitir NC por el saldo restante (${(ncModal.factura.total).toLocaleString()})</p>
              </div>
            </div>
            <button onClick={handleCrearNc} disabled={ncModal.loading || !ncModal.motivo}
              className="w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm">
              {ncModal.loading ? "Emitiendo..." : "Emitir Nota de Crédito"}
            </button>
          </div>
        </div>
      )}

      {refModal.open && refModal.factura && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setRefModal({ open: false, factura: null, metodo: "transferencia", referencia: "", importe: "", notas: "", loading: false })}>
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Registrar Reembolso</h3>
              <button onClick={() => setRefModal({ open: false, factura: null, metodo: "transferencia", referencia: "", importe: "", notas: "", loading: false })} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-gray-800/40 border border-gray-700/40 text-sm">
              <p className="text-gray-300">Factura: <span className="font-semibold">{refModal.factura.numero}</span></p>
              <p className="text-gray-400">Cliente: {refModal.factura.clientes?.nombre} {refModal.factura.clientes?.apellido}</p>
              <p className="text-gray-400">Total factura: <span className="font-semibold text-white">${refModal.factura.total.toLocaleString()}</span></p>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Monto a reembolsar *</label>
                <input type="number" step="0.01" value={refModal.importe} onChange={e => setRefModal({ ...refModal, importe: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
                <p className="text-[10px] text-gray-500 mt-1">Podés hacer reembolsos parciales</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Método *</label>
                <select value={refModal.metodo} onChange={e => setRefModal({ ...refModal, metodo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm">
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="mercadopago">MercadoPago</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Referencia / Comprobante</label>
                <input placeholder="Nº transferencia, Nº comprobante, etc." value={refModal.referencia} onChange={e => setRefModal({ ...refModal, referencia: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <input placeholder="Motivo del reembolso..." value={refModal.notas} onChange={e => setRefModal({ ...refModal, notas: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
              </div>
            </div>
            <button onClick={handleCrearReembolso} disabled={refModal.loading || !refModal.importe || parseFloat(refModal.importe) <= 0}
              className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm">
              {refModal.loading ? "Registrando..." : "Registrar Reembolso"}
            </button>
          </div>
        </div>
      )}

      {importModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold">Importar Facturas ({importModal.items.length})</h3>
              {!importModal.results && (
                <button onClick={() => setImportModal({ open: false, items: [], loading: false, results: null })} className="text-gray-400 hover:text-white">✕</button>
              )}
            </div>
            <div className="overflow-auto flex-1 p-4">
              {importModal.results ? (
                <div className="space-y-2">
                  {importModal.results.map((r: any) => (
                    <div key={r.fila} className={`p-3 rounded-xl text-sm ${r.ok ? 'bg-green-900/30 border border-green-800/40' : 'bg-red-900/30 border border-red-800/40'}`}>
                      <div className="flex justify-between">
                        <span>Fila {r.fila}: {r.ok ? `${r.numero} — CAE ${r.cae} — $${r.total}` : r.error}</span>
                        <span>{r.ok ? '✓' : '✕'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-left border-b border-gray-800">
                        <th className="pb-2 pr-2">CUIT</th>
                        <th className="pb-2 pr-2">Cliente</th>
                        <th className="pb-2 pr-2">Tipo</th>
                        <th className="pb-2 pr-2 text-right">Importe</th>
                        <th className="pb-2 pr-2">Descripción</th>
                        <th className="pb-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importModal.items.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-800/50">
                          <td className="py-2 pr-2 font-mono text-xs">{item.cliente_cuit}</td>
                          <td className="py-2 pr-2">{item.cliente_nombre || '—'}</td>
                          <td className="py-2 pr-2">{item.tipo === 1 ? 'A' : item.tipo === 6 ? 'B' : item.tipo === 11 ? 'C' : 'E'}</td>
                          <td className="py-2 pr-2 text-right font-mono">${item.importe.toLocaleString()}</td>
                          <td className="py-2 pr-2 text-gray-400">{item.descripcion}</td>
                          <td className="py-2 text-gray-400">{item.fecha || 'Hoy'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
              {importModal.results ? (
                <button onClick={() => setImportModal({ open: false, items: [], loading: false, results: null })}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">
                  Cerrar
                </button>
              ) : (
                <>
                  <button onClick={() => setImportModal({ open: false, items: [], loading: false, results: null })}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleConfirmImport} disabled={importModal.loading}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm">
                    {importModal.loading ? "Importando..." : `Confirmar importación (${importModal.items.length})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {importClientesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold">Importar Clientes ({importClientesModal.items.length})</h3>
              {!importClientesModal.results && (
                <button onClick={() => setImportClientesModal({ open: false, items: [], loading: false, results: null })} className="text-gray-400 hover:text-white">✕</button>
              )}
            </div>
            <div className="overflow-auto flex-1 p-4">
              {importClientesModal.results ? (
                <div className="space-y-2">
                  {importClientesModal.results.map((r: any) => (
                    <div key={r.fila} className={`p-3 rounded-xl text-sm ${r.ok ? 'bg-green-900/30 border border-green-800/40' : 'bg-red-900/30 border border-red-800/40'}`}>
                      <div className="flex justify-between">
                        <span>Fila {r.fila}: {r.ok ? `${r.cliente_nombre} ${r.cliente_apellido} — CUIT ${r.cuit}` : r.error}</span>
                        <span>{r.ok ? '✓' : '✕'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-left border-b border-gray-800">
                        <th className="pb-2 pr-2">Nombre</th>
                        <th className="pb-2 pr-2">Apellido</th>
                        <th className="pb-2 pr-2">WhatsApp</th>
                        <th className="pb-2 pr-2">CUIT</th>
                        <th className="pb-2 pr-2">Email</th>
                        <th className="pb-2 pr-2">Dirección</th>
                        <th className="pb-2">Cond. IVA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importClientesModal.items.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-800/50">
                          <td className="py-2 pr-2">{item.nombre}</td>
                          <td className="py-2 pr-2">{item.apellido || '—'}</td>
                          <td className="py-2 pr-2 font-mono text-xs">{item.telefono || '—'}</td>
                          <td className="py-2 pr-2 font-mono text-xs">{item.cuit}</td>
                          <td className="py-2 pr-2 text-gray-400">{item.email || '—'}</td>
                          <td className="py-2 pr-2 text-gray-400">{item.direccion || '—'}</td>
                          <td className="py-2 text-gray-400">{item.condicion_iva}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
              {importClientesModal.results ? (
                <button onClick={() => setImportClientesModal({ open: false, items: [], loading: false, results: null })}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">
                  Cerrar
                </button>
              ) : (
                <>
                  <button onClick={() => setImportClientesModal({ open: false, items: [], loading: false, results: null })}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleConfirmImportClientes} disabled={importClientesModal.loading}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm">
                    {importClientesModal.loading ? "Importando..." : `Confirmar importación (${importClientesModal.items.length})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {preview.open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-950 rounded-2xl border border-gray-800 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold">Vista previa del comprobante</h3>
              <button onClick={() => setPreview({ open: false, loading: false, html: "" })} className="text-gray-400 hover:text-white p-1" title="Cerrar">✕</button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-2">
              {preview.loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Generando vista previa...</div>
              ) : (
                <iframe title="Vista previa" className="w-full h-[70vh] rounded-lg bg-white" srcDoc={preview.html} />
              )}
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setPreview({ open: false, loading: false, html: "" })}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
