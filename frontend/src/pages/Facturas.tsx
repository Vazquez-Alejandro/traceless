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
  const [form, setForm] = useState({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios" });
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const [usarItems, setUsarItems] = useState(false);

  const load = () => api.facturas.list().then(res => setFacturas(res.facturas || []));

  useEffect(() => {
    load();
    api.clientes.list().then(res => setClientes(res.clientes || []));
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("¿Estás seguro de anular esta factura? No se puede deshacer.")) return;
    try {
      await fetch(`/api/facturas/${id}/anular`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      load();
    } catch {
      alert("Error al anular la factura");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = { ...form, importe: usarItems ? totalItems : parseFloat(form.importe), tipo: form.tipo };
    if (usarItems) {
      body.detalles = detalles.filter(d => d.descripcion && d.precio_unitario > 0);
    }
    await api.facturas.create(body);
    setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios" });
    setDetalles([]);
    setUsarItems(false);
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Facturas</h1>
        <button onClick={() => { setShowForm(!showForm); setDetalles([]); setUsarItems(false); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
          {showForm ? "Cancelar" : "+ Nueva Factura"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} required
              className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm">
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
              ))}
            </select>
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

          <label className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <input type="checkbox" checked={usarItems} onChange={e => setUsarItems(e.target.checked)} />
            Desglosar por items
          </label>

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

      <div className="space-y-3">
        {facturas.map(f => (
          <div key={f.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/40 flex items-center justify-between">
            <div>
              <div className="font-medium">{f.numero} — ${f.total.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{f.clientes?.nombre} {f.clientes?.apellido} · {f.fecha}</div>
              <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${
                f.estado === "anulada" ? "bg-red-900/40 text-red-400" : "bg-green-900/40 text-green-400"
              }`}>
                {f.estado === "anulada" ? "Anulada" : "Emitida"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a href={f.pdf_url || `/api/facturas/${f.id}`} className="text-xs text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">PDF</a>
              {f.estado !== "anulada" && (
                <button onClick={() => handleCancel(f.id)} className="text-xs text-red-400 hover:underline">Anular</button>
              )}
            </div>
          </div>
        ))}
        {facturas.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No hay facturas aún.</p>}
      </div>
    </div>
  );
}
