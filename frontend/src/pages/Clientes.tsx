import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import * as XLSX from "xlsx";

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
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "", cuit: "", direccion: "", condicion_iva: "Consumidor Final" });
  const [editingId, setEditingId] = useState<string | null>(null);
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
      if (editingId) {
        await api.clientes.update(editingId, form);
        setToast("Cliente actualizado");
      } else {
        await api.clientes.create(form);
        setToast("Cliente creado");
      }
      setForm({ nombre: "", apellido: "", email: "", telefono: "", cuit: "", direccion: "", condicion_iva: "Consumidor Final" });
      setEditingId(null);
      setShowForm(false);
      load(true);
    } catch (err: any) {
      setToast("Error: " + (err.message || "desconocido"));
    }
  };

  const handleEdit = (c: Cliente) => {
    setForm({ nombre: c.nombre, apellido: c.apellido, email: c.email, telefono: c.telefono, cuit: c.cuit, direccion: (c as any).direccion || "", condicion_iva: (c as any).condicion_iva || "Consumidor Final" });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      const mapped = rows.map((row: any) => {
        const find = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(row).find(col => col.toLowerCase().trim() === k);
            if (found && row[found]) return String(row[found]).trim();
          }
          return "";
        };
        return {
          nombre: find(["nombre", "name"]),
          apellido: find(["apellido", "surname", "last_name"]),
          email: find(["email", "correo", "mail"]),
          telefono: find(["telefono", "tel", "whatsapp", "phone", "movil"]),
          cuit: find(["cuit", "documento", "dni", "rut", "rif"]),
          direccion: find(["direccion", "address", "domicilio", "dir"]),
          condicion_iva: find(["condicion_iva", "condicion", "iva", "tax_status"]) || "Consumidor Final",
        };
      }).filter((c: any) => c.nombre);

      if (mapped.length === 0) {
        setToast("No se encontraron clientes en el archivo");
      } else {
        await api.clientes.importBulk(mapped);
        setToast(`Importados ${mapped.length} clientes`);
      }
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
            {importando ? "Importando..." : "Importar Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportExcel} className="hidden" />
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
            {showForm ? "Cancelar" : "+ Nuevo Cliente"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="relative p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6 grid md:grid-cols-2 gap-4">
          <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm({ nombre: "", apellido: "", email: "", telefono: "", cuit: "", direccion: "", condicion_iva: "Consumidor Final" }); }} className="absolute top-3 right-3 text-gray-500 hover:text-white p-1" title="Cerrar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          {editingId && <p className="col-span-2 text-sm text-gray-400 -mb-2">Editando cliente</p>}
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
          <input placeholder="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm" />
          <select value={form.condicion_iva} onChange={e => setForm({ ...form, condicion_iva: e.target.value })}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm">
            <option value="Consumidor Final">Consumidor Final</option>
            <option value="Responsable Inscripto">Responsable Inscripto</option>
            <option value="Monotributo">Monotributo</option>
            <option value="Exento">Exento</option>
            <option value="No Responsable">No Responsable</option>
          </select>
          <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">{editingId ? "Actualizar" : "Guardar"}</button>
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
              <button onClick={() => handleEdit(c)} className="text-xs text-gray-400 hover:text-white">Editar</button>
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
