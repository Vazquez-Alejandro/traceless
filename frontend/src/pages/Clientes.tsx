import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cuit: string;
}

const PAGE_SIZE = 20;

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "", cuit: "" });
  const [importando, setImportando] = useState(false);
  const [toast, setToast] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (reset = true) => {
    const newOffset = reset ? 0 : offset;
    if (reset) setOffset(0);
    const res = await api.clientes.list(PAGE_SIZE, newOffset);
    if (reset) {
      setClientes(res.clientes || []);
    } else {
      setClientes(prev => [...prev, ...(res.clientes || [])]);
    }
    setTotal(res.total || 0);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    const res = await api.clientes.list(PAGE_SIZE, nextOffset);
    setClientes(prev => [...prev, ...(res.clientes || [])]);
    setTotal(res.total || 0);
    setLoadingMore(false);
  };

  const copiar = (c: Cliente) => {
    const txt = `${c.nombre} ${c.apellido} - CUIT: ${c.cuit || "—"} - Tel: ${c.telefono || "—"}`;
    navigator.clipboard.writeText(txt);
    setToast("Datos copiados: " + txt.slice(0, 40) + "...");
  };

  const handleDelete = async (c: Cliente) => {
    if (!confirm(`¿Eliminar a ${c.nombre} ${c.apellido}? Se perderá todo su historial.`)) return;
    try {
      await api.clientes.delete(c.id);
      setToast(`${c.nombre} eliminado`);
      load(true);
    } catch {
      alert("Error al eliminar el cliente");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.clientes.create(form);
      setForm({ nombre: "", apellido: "", email: "", telefono: "", cuit: "" });
      setShowForm(false);
      setToast("Cliente creado");
      load(true);
    } catch (err: any) {
      setToast("Error: " + (err.message || "desconocido"));
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const header = lines[0].toLowerCase();
    const cols = header.split(",").map(c => c.trim());
    const data = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const idx = (name: string) => cols.indexOf(name);
      return {
        nombre: vals[idx("nombre")] || "",
        apellido: vals[idx("apellido")] || vals[idx("nombre")] || "",
        email: vals[idx("email")] || "",
        telefono: vals[idx("telefono")] || vals[idx("whatsapp")] || "",
        cuit: vals[idx("cuit")] || vals[idx("documento")] || "",
        direccion: vals[idx("direccion")] || "",
        condicion_iva: "Responsable Inscripto",
      };
    });
    try {
      await api.clientes.importBulk(data);
      setToast(`Importados ${data.length} clientes`);
    } catch (err: any) {
      setToast("Error al importar: " + (err.message || "desconocido"));
    }
    setImportando(false);
    load(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const hasMore = clientes.length < total;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          {total > 0 && <p className="text-xs text-gray-500 mt-1">{total} clientes</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl">
            {importando ? "Importando..." : "Importar CSV"}
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
            {showForm ? "Cancelar" : "+ Nuevo Cliente"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="relative p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6 grid md:grid-cols-2 gap-4">
          <button type="button" onClick={() => setShowForm(false)} className="absolute top-3 right-3 text-gray-500 hover:text-white p-1" title="Cerrar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
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
      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-green-900/40 border border-green-700/40 text-sm text-green-300 text-center">
          {toast}
        </div>
      )}

        {clientes.map(c => (
          <div key={c.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/40 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.nombre} {c.apellido}</div>
              <div className="text-xs text-gray-500">{c.cuit || c.email || c.telefono}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/clientes/${c.id}`} className="text-xs text-blue-400 hover:underline">Ver historial</Link>
              <button onClick={() => copiar(c)} className="text-xs text-gray-400 hover:text-white">Copiar</button>
              <button onClick={() => handleDelete(c)} className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
            </div>
          </div>
        ))}
        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore}
            className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 bg-gray-900/40 border border-gray-800/40 rounded-xl transition-all disabled:opacity-50">
            {loadingMore ? "Cargando..." : `Cargar más (${clientes.length} de ${total})`}
          </button>
        )}
        {clientes.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No tenés clientes aún. Creá tu primero o importá un CSV.</p>}
      </div>
    </div>
  );
}
