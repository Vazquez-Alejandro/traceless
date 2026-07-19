import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
}

interface Factura {
  id: string;
  numero: string;
  total: number;
  fecha: string;
  vencimiento: string;
  fecha_pago?: string;
  estado: string;
  clientes: Cliente;
  pdf_url?: string;
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
  const [form, setForm] = useState({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false });
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const [usarItems, setUsarItems] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [toast, setToast] = useState("");
  const [ultimoLink, setUltimoLink] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [cliForm, setCliForm] = useState({ nombre: "", apellido: "", telefono: "", cuit: "" });

  const load = () => api.facturas.list().then(res => setFacturas(res.facturas || []));

  useEffect(() => {
    load();
    api.clientes.list().then(res => setClientes(res.clientes || []));
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
    const body: any = { ...form, importe: usarItems ? totalItems : parseFloat(form.importe), tipo: form.tipo };
    if (usarItems) {
      body.detalles = detalles.filter(d => d.descripcion && d.precio_unitario > 0);
    }
    const res = await api.facturas.create(body);
    const id = res?.factura?.id;
    const link = id ? `${window.location.origin}/api/facturas/public/${id}` : "";
    setUltimoLink(link);
    setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios", recurrente: false });
    setDetalles([]);
    setUsarItems(false);
    setShowForm(false);
    setToast("Factura creada ✅ Compartila con tu cliente");
    load();
  };

  const crearClienteRapido = async () => {
    if (!cliForm.nombre) return;
    await api.clientes.create(cliForm);
    setNuevoCliente(false);
    setCliForm({ nombre: "", apellido: "", telefono: "", cuit: "" });
    const res = await api.clientes.list();
    setClientes(res.clientes || []);
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
          <button onClick={() => { setShowForm(!showForm); setDetalles([]); setUsarItems(false); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
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
              <div className="flex gap-2 col-span-2 p-3 bg-gray-900/60 rounded-xl border border-gray-800/40">
                <input placeholder="Nombre" value={cliForm.nombre} onChange={e => setCliForm({...cliForm, nombre: e.target.value})}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                <input placeholder="Apellido" value={cliForm.apellido} onChange={e => setCliForm({...cliForm, apellido: e.target.value})}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                <input placeholder="WhatsApp" value={cliForm.telefono} onChange={e => setCliForm({...cliForm, telefono: e.target.value})}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm" />
                <button type="button" onClick={crearClienteRapido} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">Crear</button>
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

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={usarItems} onChange={e => setUsarItems(e.target.checked)} />
              Desglosar por items
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={form.recurrente} onChange={e => setForm({ ...form, recurrente: e.target.checked })} />
              Factura recurrente (se repite cada mes)
            </label>
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

          <button type="submit" className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">
            Emitir Factura
          </button>
        </form>
      )}

      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-green-900/40 border border-green-700/40 text-sm text-green-300 flex items-center justify-center gap-2">
          <span>{toast}</span>
          {ultimoLink && (
            <button onClick={() => { navigator.clipboard.writeText(ultimoLink); setToast("✅ Link copiado"); }} className="text-green-200 underline hover:text-white text-xs">
              Copiar link
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {facturas.map(f => (
          <div key={f.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/40 flex items-center justify-between">
            <div>
              <div className="font-medium">{f.numero} — ${f.total.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{f.clientes?.nombre} {f.clientes?.apellido} · {f.fecha} · Vence: {f.vencimiento || "—"}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${
                  f.estado === "pagada" ? "bg-green-900/40 text-green-400" :
                  f.estado === "anulada" ? "bg-red-900/40 text-red-400" :
                  f.estado === "vencida" ? "bg-yellow-900/40 text-yellow-400" : "bg-blue-900/40 text-blue-400"
                }`}>
                  {f.estado === "pagada" ? "Pagada" : f.estado === "anulada" ? "Anulada" : f.estado === "vencida" ? "Vencida" : "Emitida"}
                </span>
                {(f as any).recurrente && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">Recurrente</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-1">
                <span>📄 {f.fecha}</span>
                {f.fecha_pago && <span>💚 {f.fecha_pago}</span>}
                {f.estado === "anulada" && <span>🗑️ Anulada</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {copiado === f.id ? (
                <span className="text-xs text-green-400">¡Link copiado!</span>
              ) : (
                <button onClick={() => handleShare(f.id)} className="text-xs text-gray-400 hover:text-white">Compartir</button>
              )}
              <a href={f.pdf_url || `/api/facturas/${f.id}`} className="text-xs text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">PDF</a>
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
