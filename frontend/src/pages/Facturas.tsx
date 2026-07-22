import { useEffect, useState } from "react";
import { api } from "../api/client";

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
}

interface DetalleItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export default function Facturas() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "" });
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const [usarItems, setUsarItems] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [toast, setToast] = useState("");
  const [ultimoLink, setUltimoLink] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [cliForm, setCliForm] = useState({ nombre: "", apellido: "", telefono: "", cuit: "" });
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<{ invoices_limit: number | null; invoices_used: number; features: { recurrentes: boolean; analytics: boolean } }>({ invoices_limit: 3, invoices_used: 0, features: { recurrentes: false, analytics: false } });
  const [selected, setSelected] = useState<Set<string>>(new Set());


  const load = () => api.facturas.list().then(res => setFacturas(res.facturas || []));

  useEffect(() => {
    load();
    api.clientes.list().then(res => setClientes(res.clientes || []));
    api.auth.me().then(res => {
      if (res.user) setUserPlan({ invoices_limit: res.user.invoices_limit, invoices_used: res.user.invoices_used, features: res.user.features || { recurrentes: false, analytics: false } });
    });
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
      load();
    } catch {
      alert("Error al anular la factura");
    }
  };

  const handlePay = async (id: string) => {
    try {
      await fetch(`/api/facturas/${id}/pagar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setToast("Factura marcada como pagada");
      load();
    } catch {
      alert("Error al marcar como pagada");
    }
  };

  const handleShare = async (facturaId: string) => {
    const url = `${window.location.origin}/api/facturas/public/${facturaId}`;
    await navigator.clipboard.writeText(url);
    setCopiado(facturaId);
    setToast("Link de factura copiado al portapapeles");
    setTimeout(() => setCopiado(""), 2000);
  };

  const handleWhatsApp = (f: Factura) => {
    const telefono = f.clientes?.telefono?.replace(/[^0-9]/g, "") || "";
    const url = `${window.location.origin}/api/facturas/public/${f.id}`;
    const msg = encodeURIComponent(`Hola ${f.clientes?.nombre}, te envío la factura ${f.numero} por $${f.total.toLocaleString()}. Podés verla acá: ${url}`);
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
    });
    setDetalles([]);
    setUsarItems(false);
    setShowForm(true);
    setToast("Datos copiados. Modificá lo que necesites y emití.");
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
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/facturas/enviar-whatsapp`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ factura_ids: ids }),
    }).then(r => r.json());
    setLoading(false);
    setSelected(new Set());
    if (res.errores?.length > 0) {
      const msgs = res.errores.map((e: any) => e.error).join("; ");
      setToast(`Enviados: ${res.enviados || 0}. Errores: ${msgs}`);
    } else {
      setToast(`${res.enviados || 0} facturas enviadas por WhatsApp ✅`);
    }
    setTimeout(() => setToast(""), 6000);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const body: any = { ...form, importe: usarItems ? totalItems : parseFloat(form.importe), tipo: form.tipo, scheduled_send: form.scheduled_send || undefined };
    if (usarItems) {
      body.detalles = detalles.filter(d => d.descripcion && d.precio_unitario > 0);
    }
    const res = await api.facturas.create(body);
    if (res.error) {
      setToast("Error: " + res.error);
      setTimeout(() => setToast(""), 5000);
      setLoading(false);
      return;
    }
    if (res.pendiente) {
      setToast("⏳ ARCA está tomando un café. Dejanos la factura acá, nos encargamos de aprobarla y enviarla por WhatsApp apenas vuelva. Podés cerrar la app tranquilo.");
      setTimeout(() => setToast(""), 8000);
      setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "" });
      setDetalles([]);
      setUsarItems(false);
      setShowForm(false);
      setLoading(false);
      load();
      return;
    }
    const id = res?.factura?.id;
    const link = id ? `${window.location.origin}/api/facturas/public/${id}` : "";
    setUltimoLink(link);
    setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false, scheduled_send: "" });
    setDetalles([]);
    setUsarItems(false);
    setShowForm(false);
    setToast("Factura creada ✅ Compartila con tu cliente");
    setLoading(false);
    load();
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
    const list = await api.clientes.list();
    setClientes(list.clientes || []);
    if (nuevo?.id) {
      setForm({ ...form, cliente_id: nuevo.id });
      setToast("Cliente creado y seleccionado ✅");
    }
    setLoading(false);
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Facturas</h1>
        <div className="flex gap-2">
          <button onClick={() => {
            const t = localStorage.getItem("token");
            window.open(`/api/facturas/export?token=${t}`, "_blank");
          }} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl">
            Exportar Excel
          </button>
          <button onClick={() => {
            if (userPlan.invoices_limit !== null && userPlan.invoices_used >= userPlan.invoices_limit) {
              setToast(`Límite de ${userPlan.invoices_limit} facturas/mes alcanzado. Actualizá tu plan para seguir facturando.`);
              return;
            }
            setShowForm(!showForm); setDetalles([]); setUsarItems(false);
          }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
            {showForm ? "Cancelar" : "+ Nueva Factura"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="flex gap-2">
              <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} required
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
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                  <input type="number" step="1" placeholder="Cant." value={d.cantidad} onChange={e => updateItem(i, "cantidad", parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-center" />
                  <input type="number" step="0.01" placeholder="P.Unit" value={d.precio_unitario} onChange={e => updateItem(i, "precio_unitario", parseFloat(e.target.value) || 0)}
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

          <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm">
            {loading ? "Guardando..." : form.scheduled_send ? "Programar Factura" : "Emitir Factura"}
          </button>
        </form>
      )}

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

      <div className="space-y-3">
        {facturas.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-gray-900/60 border border-gray-800/30">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={selected.size === facturas.length && facturas.length > 0} onChange={toggleSelectAll} className="rounded" />
                Todas ({selected.size}/{facturas.length})
              </label>
            </div>
            {selected.size > 0 && (
              <button onClick={handleBulkWhatsApp} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg">
                📨 Enviar {selected.size} por WhatsApp
              </button>
            )}
          </div>
        )}
        {facturas.map(f => (
          <div key={f.id} className={`p-4 rounded-xl bg-gray-900/40 border flex items-center justify-between ${selected.has(f.id) ? "border-green-500/40 bg-green-900/10" : "border-gray-800/40"}`}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} className="rounded flex-shrink-0" />
            <div>
              <div className="font-medium">{f.numero || "—"} — ${f.total.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{f.clientes?.nombre} {f.clientes?.apellido} · {f.fecha} · {f.vencimiento ? `Vence: ${f.vencimiento}` : ""}</div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${
                  f.estado === "pagada" ? "bg-green-900/40 text-green-400" :
                  f.estado === "anulada" ? "bg-red-900/40 text-red-400" :
                  f.estado === "vencida" ? "bg-yellow-900/40 text-yellow-400" :
                  f.estado === "programada" ? "bg-purple-900/40 text-purple-400" : "bg-blue-900/40 text-blue-400"
                }`}>
                  {f.estado === "pagada" ? "Pagada" : f.estado === "anulada" ? "Anulada" : f.estado === "vencida" ? "Vencida" : f.estado === "programada" ? "Programada" : "Emitida"}
                </span>
                {f.scheduled_send && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">📅 {f.scheduled_send}</span>
                )}
                {(f as any).recurrente && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">Recurrente</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-1">
                <span>📄 {f.fecha}</span>
                {f.fecha_pago && <span>💚 {f.fecha_pago}</span>}
                {f.estado === "anulada" && <span>🗑️ Anulada</span>}
                {f.mp_link && <span>💳 Link de pago</span>}
              </div>
            </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleClone(f)} title="Reemitir esta factura" className="text-xs text-gray-400 hover:text-white">Reemitir</button>
              {f.estado !== "programada" && (
                <button onClick={() => handleWhatsApp(f)} title="Enviar por WhatsApp" className="text-xs text-green-400 hover:text-green-300">WhatsApp</button>
              )}
              {copiado === f.id ? (
                <span className="text-xs text-green-400">¡Link copiado!</span>
              ) : (
                <button onClick={() => handleShare(f.id)} className="text-xs text-gray-400 hover:text-white">Copiar link</button>
              )}
              {f.mp_link && (
                <div className="flex items-center gap-1">
                  <a href={f.mp_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline">💳 Pagar</a>
                  <button onClick={async () => { await navigator.clipboard.writeText(f.mp_link!); setToast("Link de pago copiado"); }} className="text-xs text-gray-500 hover:text-white" title="Copiar link de pago">📋</button>
                </div>
              )}
              {f.estado !== "programada" && (
                <a href={`/api/facturas/${f.id}/pdf`} className="text-xs text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">PDF</a>
              )}
              {f.estado === "emitida" && (
                <>
                  <button onClick={() => handlePay(f.id)} className="text-xs text-green-400 hover:underline">Pagada</button>
                  <button onClick={() => handleCancel(f.id)} className="text-xs text-red-400 hover:underline">Anular</button>
                </>
              )}
            </div>
          </div>
        ))}
        {facturas.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No hay facturas aún.</p>}
      </div>
    </div>
  );
}
