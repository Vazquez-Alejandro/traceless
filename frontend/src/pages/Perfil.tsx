import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

const PLANS_LIST = [
  { key: "free", name: "Gratis", price: "$0", desc: "3 facturas/mes" },
  { key: "pro", name: "Profesional", price: "$15.000/mes", desc: "Ilimitado + WhatsApp" },
  { key: "team", name: "Equipo", price: "$29.000/mes", desc: "Hasta 5 usuarios" },
];

export default function Perfil() {
  const [user, setUser] = useState<any>({});
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ nombre: "", cuit: "", telefono: "", condicion_iva: "", cbu: "", alias_banco: "", direccion: "", empresa: "", logo_url: "", email_fiscal: "", condiciones_venta: "", recordatorios_whatsapp: true, recordatorio_monotributo: true, recordatorio_vencidas: true });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      const u = d.user || d;
      setUser(u);
      setForm({ nombre: u.nombre || "", cuit: u.cuit || "", direccion: u.direccion || "", telefono: u.telefono || "", condicion_iva: u.condicion_iva || "Responsable Inscripto", cbu: u.cbu || "", alias_banco: u.alias_banco || "", empresa: u.empresa || "", logo_url: u.logo_url || "", email_fiscal: u.email_fiscal || "", condiciones_venta: u.condiciones_venta || "", recordatorios_whatsapp: u.recordatorios_whatsapp !== false, recordatorio_monotributo: u.recordatorio_monotributo !== false, recordatorio_vencidas: u.recordatorio_vencidas !== false });
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
    const r = await fetch(`${BASE_URL}/api/mercadopago/checkout?plan_key=${planKey}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (d.url) window.location.href = d.url;
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

      {msg && <div className="mb-4 p-3 bg-green-900/30 border border-green-700/30 rounded-xl text-sm text-green-300">{msg}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Datos personales</h2>
            <button onClick={() => setEdit(!edit)} className="text-xs text-blue-400 hover:underline">
              {edit ? "Cancelar" : "Editar"}
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
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
              <label className="text-gray-500 text-xs">Domicilio fiscal</label>
              {edit ? (
                <input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
              ) : <p className="text-white mt-0.5">{user.direccion || "—"}</p>}
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
              <label className="text-gray-500 text-xs">CBU (para transferencia)</label>
              {edit ? (
                <input value={form.cbu} onChange={e => setForm({...form, cbu: e.target.value})} placeholder="Ej: 0000000000000000000000"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
              ) : <p className="text-white mt-0.5 font-mono">{user.cbu || "—"}</p>}
            </div>
            <div>
              <label className="text-gray-500 text-xs">Alias CBU</label>
              {edit ? (
                <input value={form.alias_banco} onChange={e => setForm({...form, alias_banco: e.target.value})} placeholder="Ej: mi.alias"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
              ) : <p className="text-white mt-0.5 font-mono">{user.alias_banco || "—"}</p>}
            </div>
            <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Datos de empresa (opcional)</h3>
            </div>
            <div>
              <label className="text-gray-500 text-xs">Nombre de empresa</label>
              {edit ? (
                <input value={form.empresa} onChange={e => setForm({...form, empresa: e.target.value})} placeholder="Aparece en las facturas"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
              ) : <p className="text-white mt-0.5">{user.empresa || "—"}</p>}
            </div>
            <div>
              <label className="text-gray-500 text-xs">Logo (URL de imagen)</label>
              {edit ? (
                <input value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
              ) : <p className="text-white mt-0.5 text-xs break-all">{user.logo_url || "—"}</p>}
            </div>
            <div>
              <label className="text-gray-500 text-xs">Email fiscal</label>
              {edit ? (
                <input value={form.email_fiscal} onChange={e => setForm({...form, email_fiscal: e.target.value})} placeholder="facturacion@empresa.com"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
              ) : <p className="text-white mt-0.5">{user.email_fiscal || "—"}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-500 text-xs">Condiciones de venta (aparece en la factura)</label>
              {edit ? (
                <textarea value={form.condiciones_venta} onChange={e => setForm({...form, condiciones_venta: e.target.value})} rows={2} placeholder="Ej: Pago a 30 días, transferencia bancaria, etc."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1 resize-none" />
              ) : <p className="text-white mt-0.5">{user.condiciones_venta || "—"}</p>}
            </div>
            {edit && (
              <div className="md:col-span-2">
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
                  Guardar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Tu plan</h2>
            <p className="text-2xl font-bold text-white mb-1">{user.plan || "Gratis"}</p>
            <p className="text-xs text-gray-500">
              {user.whatsapp_configurado ? "🟢 Envío directo por API" : "🟡 Envío por wa.me (sin configurar)"}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Cambiar de plan</h2>
            <div className="space-y-2">
              {PLANS_LIST.map(p => (
                <div key={p.key} className={`flex items-center justify-between p-3 rounded-xl border ${
                  p.name === user.plan ? "border-blue-500/40 bg-blue-600/10" : "border-gray-800/40 bg-gray-900/20"
                }`}>
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold">{p.price}</div>
                    {p.name !== user.plan && p.key !== "free" && (
                      <button onClick={() => handleUpgrade(p.key)}
                        className="text-[10px] text-blue-400 hover:underline mt-0.5">
                        Elegir
                      </button>
                    )}
                    {p.name === user.plan && (
                      <span className="text-[10px] text-blue-400">Actual</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Recordatorios por WhatsApp</h2>
            <p className="text-xs text-gray-500 mb-4">Elegí qué recordatorios querés recibir. Podés desactivarlos en cualquier momento, o respondé "ALTO" en WhatsApp.</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.recordatorios_whatsapp}
                  onChange={e => setForm({...form, recordatorios_whatsapp: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500" />
                <div>
                  <div className="text-sm">Recordatorios de cobro</div>
                  <div className="text-xs text-gray-500">Facturas impagas (cada lunes)</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.recordatorio_monotributo}
                  onChange={e => setForm({...form, recordatorio_monotributo: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500" />
                <div>
                  <div className="text-sm">Recordatorio de monotributo</div>
                  <div className="text-xs text-gray-500">Día 20 de cada mes</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.recordatorio_vencidas}
                  onChange={e => setForm({...form, recordatorio_vencidas: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500" />
                <div>
                  <div className="text-sm">Alertas de facturas vencidas</div>
                  <div className="text-xs text-gray-500">Cuando una factura pasa de 30 días</div>
                </div>
              </label>
            </div>
            {edit && (
              <button onClick={handleSave} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">
                Guardar preferencias
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
