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

export default function Facturas() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios" });

  const load = () => api.facturas.list().then(res => setFacturas(res.facturas || []));

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

  useEffect(() => {
    load();
    api.clientes.list().then(res => setClientes(res.clientes || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.facturas.create({ ...form, importe: parseFloat(form.importe), tipo: form.tipo });
    setForm({ cliente_id: "", tipo: 6, importe: "", descripcion: "Honorarios" });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Facturas</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
          {showForm ? "Cancelar" : "+ Nueva Factura"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6 grid md:grid-cols-2 gap-4">
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
          <input type="number" step="0.01" placeholder="Importe ($)" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} required
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <input placeholder="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <button type="submit" className="md:col-span-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">
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
