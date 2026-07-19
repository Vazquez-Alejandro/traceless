import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

const PLANS_LIST = [
  { key: "free", name: "Gratis", price: "Gratis" },
  { key: "basic", name: "Básico", price: "$9/mes" },
  { key: "pro", name: "Pro", price: "$19/mes" },
  { key: "pyme", name: "PyME", price: "$29/mes" },
  { key: "corporate", name: "Corporativo", price: "$99/mes" },
];

export default function Perfil() {
  const [user, setUser] = useState<any>({});
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ nombre: "", cuit: "", telefono: "", condicion_iva: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      const u = d.user || d;
      setUser(u);
      setForm({ nombre: u.nombre || "", cuit: u.cuit || "", telefono: u.telefono || "", condicion_iva: u.condicion_iva || "Responsable Inscripto" });
    });
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    await fetch(`${BASE_URL}/api/auth/me`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setUser({ ...user, ...form });
    setEdit(false);
    setMsg("Perfil actualizado");
    setTimeout(() => setMsg(""), 3000);
  };

  const handleUpgrade = async (planKey: string) => {
    if (planKey === "free") return;
    const token = localStorage.getItem("token");
    const r = await fetch(`${BASE_URL}/api/checkout/${planKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (d.url) window.location.href = d.url;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

      {msg && <div className="mb-4 p-3 bg-green-900/30 border border-green-700/30 rounded-xl text-sm text-green-300">{msg}</div>}

      <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Datos personales</h2>
          <button onClick={() => setEdit(!edit)} className="text-xs text-blue-400 hover:underline">
            {edit ? "Cancelar" : "Editar"}
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-gray-500 text-xs">Nombre</label>
            {edit ? (
              <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
            ) : <p className="text-white mt-0.5">{user.nombre || "—"}</p>}
          </div>
          <div>
            <label className="text-gray-500 text-xs">Email</label>
            <p className="text-white mt-0.5">{user.email}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs">CUIT</label>
            {edit ? (
              <input value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
            ) : <p className="text-white mt-0.5">{user.cuit || "—"}</p>}
          </div>
          <div>
            <label className="text-gray-500 text-xs">Teléfono</label>
            {edit ? (
              <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
            ) : <p className="text-white mt-0.5">{user.telefono || "—"}</p>}
          </div>
          <div>
            <label className="text-gray-500 text-xs">Condición IVA</label>
            {edit ? (
              <select value={form.condicion_iva} onChange={e => setForm({...form, condicion_iva: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1">
                <option>Responsable Inscripto</option>
                <option>Monotributista</option>
                <option>Consumidor Final</option>
                <option>Exento</option>
              </select>
            ) : <p className="text-white mt-0.5">{user.condicion_iva || "—"}</p>}
          </div>
          <div>
            <label className="text-gray-500 text-xs">Plan actual</label>
            <p className="text-white mt-0.5 font-semibold">{user.plan}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs">WhatsApp</label>
            <p className="text-white mt-0.5">
              {user.whatsapp_configurado
                ? <span className="text-green-400">✅ Configurado</span>
                : <span className="text-yellow-400">⏳ Pendiente de configuración</span>}
            </p>
          </div>
          {edit && (
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl mt-2">
              Guardar
            </button>
          )}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
        <h2 className="text-lg font-semibold mb-4">Cambiar de plan</h2>
        <div className="grid gap-3">
          {PLANS_LIST.map(p => (
            <div key={p.key} className={`flex items-center justify-between p-4 rounded-xl border ${
              p.name === user.plan ? "border-blue-500/40 bg-blue-600/10" : "border-gray-800/40 bg-gray-900/20"
            }`}>
              <div>
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-gray-400 text-xs ml-2">{p.price}</span>
                {p.name === user.plan && <span className="text-blue-400 text-xs ml-2">(Actual)</span>}
              </div>
              {p.name !== user.plan && p.key !== "free" && (
                <button onClick={() => handleUpgrade(p.key)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
                  Elegir
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
