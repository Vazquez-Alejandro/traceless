import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cuit: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "", cuit: "" });

  const load = () => api.clientes.list().then(res => setClientes(res.clientes || []));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.clientes.create(form);
    setForm({ nombre: "", apellido: "", email: "", telefono: "", cuit: "" });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
          {showForm ? "Cancelar" : "+ Nuevo Cliente"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6 grid md:grid-cols-2 gap-4">
          <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <input placeholder="Apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <input placeholder="Teléfono (WhatsApp)" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <input placeholder="CUIT" value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">Guardar</button>
        </form>
      )}

      <div className="space-y-3">
        {clientes.map(c => (
          <div key={c.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/40 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.nombre} {c.apellido}</div>
              <div className="text-xs text-gray-500">{c.cuit || c.email || c.telefono}</div>
            </div>
          </div>
        ))}
        {clientes.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No tenés clientes aún. Creá tu primero.</p>}
      </div>
    </div>
  );
}
