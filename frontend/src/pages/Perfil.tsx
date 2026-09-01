import { useEffect, useState } from "react";
import { getPricing, formatARS } from "../pricing";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

const PLANS_LIST = [
  { key: "free", name: "Gratis", price: "$0", desc: "20 facturas/mes, sin WhatsApp API" },
  { key: "pro", name: "Profesional", price: "price_pro", desc: "Ilimitado + 100 msg WhatsApp, $70/msg extra" },
  { key: "team", name: "Equipo", price: "price_team", desc: "Ilimitado + 250 msg WhatsApp + Facturá por WhatsApp, $60/msg extra" },
];

export default function Perfil() {
  const [user, setUser] = useState<any>({});
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ nombre: "", cuit: "", telefono: "", condicion_iva: "", cbu: "", alias_banco: "", direccion: "", empresa: "", logo_url: "", email_fiscal: "", condiciones_venta: "", recordatorios_whatsapp: false, recordatorio_monotributo: false, recordatorio_vencidas: false });
  const [arca, setArca] = useState({ arca_cuit: "", arca_cert: "", arca_key: "", arca_punto_venta: 2, arca_env: "produccion" });
  const [arcaMsg, setArcaMsg] = useState("");
  const [confirmDeleteLogo, setConfirmDeleteLogo] = useState(false);
  const [referido, setReferido] = useState({ codigo: "", total_referidos: 0, creditos_ganados: 0 });
  const [codigoInput, setCodigoInput] = useState("");
  const [arcaState, setArcaState] = useState<"idle" | "validating" | "ok" | "error">("idle");
  const [logoPreview, setLogoPreview] = useState("");
  const [msg, setMsg] = useState("");
  const [pricing, setPricing] = useState<Record<string, { label: string; label_ars: string; ars: number }>>({});
  useEffect(() => {
    getPricing().then((p) => {
      if (p && p.prices) setPricing({ pro: p.prices.pro, team: p.prices.team });
    });
  }, []);

  const priceFor = (key: string) => {
    if (key === "free") return "$0";
    const ref = pricing[key === "pro" ? "pro" : "team"];
    if (!ref) return key === "pro" ? "USD 12" : "USD 22";
    return `${ref.label}/mes`;
  };

  const certExpired = user.arca_cert_expira ? new Date(user.arca_cert_expira) < new Date() : false;
  const certWarning =
    !user.arca_cert_expira ? "" :
    user.arca_cert_expira.split("-").reverse().join("/");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      const u = d.user || d;
      setUser(u);
      setForm({ nombre: u.nombre || "", cuit: u.cuit || "", direccion: u.direccion || "", telefono: u.telefono || "", condicion_iva: u.condicion_iva || "Responsable Inscripto", cbu: u.cbu || "", alias_banco: u.alias_banco || "", empresa: u.empresa || "", logo_url: u.logo_url || "", email_fiscal: u.email_fiscal || "", condiciones_venta: u.condiciones_venta || "", recordatorios_whatsapp: !!u.recordatorios_whatsapp, recordatorio_monotributo: !!u.recordatorio_monotributo, recordatorio_vencidas: !!u.recordatorio_vencidas });
      setArca({ arca_cuit: u.arca_cuit || "", arca_cert: "", arca_key: "", arca_punto_venta: u.arca_punto_venta || 2, arca_env: u.arca_env || "produccion" });
      const storedLogo = u.logo_url || "";
      if (storedLogo) setLogoPreview(storedLogo);
      fetch(`${BASE_URL}/api/auth/referido`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => {
        if (d.codigo) setReferido(d);
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (user.logo_url) setLogoPreview(user.logo_url);
  }, [user.logo_url]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const okType = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type);
    if (!okType) {
      setMsg("Formato no válido. Usá PNG, JPG, WebP o SVG.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg("La imagen es muy grande (máx. 2MB). Usá una más liviana.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setLogoPreview(dataUrl);
      setForm({ ...form, logo_url: dataUrl });
    };
    reader.readAsDataURL(file);
  };

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

  const handleArcaSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!arca.arca_cuit.trim()) {
      setArcaState("error");
      setArcaMsg("Ingresá el CUIT del emisor.");
      return;
    }
    setArcaState("validating");
    setArcaMsg("Validando certificado con ARCA…");
    const body = {
      arca_cuit: arca.arca_cuit.trim().replace(/\./g, ""),
      arca_cert: arca.arca_cert.trim(),
      arca_key: arca.arca_key.trim(),
      arca_punto_venta: Number(arca.arca_punto_venta) || 2,
      arca_env: arca.arca_env,
    };
    try {
      const r = await fetch(`${BASE_URL}/api/auth/arca/connect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setArcaState("error");
        setArcaMsg(`❌ ${d.detail || d.mensaje || "No se pudo conectar la facturación fiscal."}`);
        return;
      }
      setArcaState("ok");
      setArcaMsg(`✓ Facturación fiscal conectada y verificada (CUIT ${body.arca_cuit}).`);
      setUser({ ...user, arca_configurado: true, arca_cuit: body.arca_cuit, arca_env: body.arca_env, arca_punto_venta: body.arca_punto_venta });
      setArca({ ...arca, arca_cert: "", arca_key: "" });
    } catch (e) {
      setArcaState("error");
      setArcaMsg("❌ Error de conexión. Verificá tu internet e intentá de nuevo.");
    }
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

  const handleCancelSubscription = async () => {
    if (!window.confirm("¿Cancelar tu suscripción? Volverás al plan Gratis al finalizar el período actual.")) return;
    const token = localStorage.getItem("token");
    try {
      const r = await fetch(`${BASE_URL}/api/mercadopago/cancel-subscription`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setMsg(d.message || (d.error?.message || (r.ok ? "Suscripción cancelada" : "Error al cancelar")));
      if (r.ok) setUser({ ...user, plan: user.plan === "Profesional" ? "Gratis" : user.plan, plan_key: "free" });
    } catch (e) {
      setMsg("❌ No se pudo cancelar la suscripción. Intentá de nuevo.");
    }
  };

  const handleDeleteLogo = async () => {
    setConfirmDeleteLogo(false);
    setForm({ ...form, logo_url: "" });
    setLogoPreview("");
    await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ logo_url: "" }),
    });
    setUser({ ...user, logo_url: "" });
    setMsg("Logo eliminado");
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
              <div className="flex items-center justify-between">
                <label className="text-gray-500 text-xs">Logo</label>
                <button onClick={() => setConfirmDeleteLogo(true)} className="text-[10px] text-red-400 hover:underline">{logoPreview || form.logo_url ? "Eliminar logo" : ""}</button>
              </div>
              {logoPreview && (
                <img src={logoPreview} alt="logo" className="mt-1 max-h-12 object-contain rounded" />
              )}
              {edit ? (
                <div className="mt-2">
                  <input value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} placeholder="https://... o usá el botón de abajo"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
                  <label className="mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 cursor-pointer">
                    Subir imagen
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-gray-500 mt-1">PNG, JPG, WebP o SVG · máx. 2MB</p>
                </div>
              ) : <p className="text-white mt-0.5 text-xs break-all">{user.logo_url ? "✓ Logo cargado" : "—"}</p>}
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
            {user.plan_key && user.plan_key !== "free" && (
              <button
                onClick={handleCancelSubscription}
                className="mt-4 w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-700/40 text-red-300 text-sm font-semibold rounded-xl transition-colors"
              >
                Cancelar suscripción
              </button>
            )}
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
                    <div className="text-xs font-semibold">{priceFor(p.key)}</div>
                    {p.key !== "free" && (
                      <div className="text-[10px] text-gray-500">≈ {formatARS(pricing[p.key]?.ars ?? 0)}</div>
                    )}
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
          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-400">Facturación fiscal (ARCA)</h2>
              <span className={`text-[10px] px-2 py-1 rounded-full ${user.arca_configurado ? "bg-green-900/50 text-green-300" : "bg-amber-900/50 text-amber-300"}`}>
                {user.arca_configurado ? "● Conectada" : "● Sin conectar"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {user.arca_configurado
                ? "Tu facturación fiscal está conectada y verificada. Emitís facturas con CAE válido ante AFIP."
                : "Conectá tu CUIT y certificado digital para emitir facturas fiscales con CAE. Mientras tanto emitís comprobantes simples (sin CAE)."}
            </p>
            {!user.arca_configurado && (
              <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-800/30 text-xs text-blue-300 leading-relaxed">
                <p className="font-semibold mb-1">Cómo generar tu certificado digital:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-200/80">
                  <li>Ingresá al <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml?action=SYSTEM&system=arfe_certificado" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100">Administrador de Certificados Digitales de ARCA</a> y generá tu certificado</li>
                  <li>Bajá los archivos <code className="bg-blue-900/40 px-1 rounded">cert.pem</code> y <code className="bg-blue-900/40 px-1 rounded">key.pem</code></li>
                  <li>Cargalos acá abajo</li>
                </ol>
                <p className="mt-2 text-blue-400/60">Para más info: <a href="https://www.afip.gob.ar/ws/WSAA/WSAA.ObtenerCertificado.pdf" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Guía paso a paso</a> · <a href="https://www.afip.gob.ar/ws/WSAA/wsaa_obtener_certificado_produccion.pdf" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Certificado en producción</a></p>
              </div>
            )}
            {certWarning && (
              <div className={`mb-3 p-3 rounded-lg text-sm border ${certExpired ? "bg-red-900/30 border-red-700/40 text-red-300" : "bg-amber-900/30 border-amber-700/40 text-amber-200"}`}>
                {certExpired
                  ? `⚠ Tu certificado digital de ARCA venció el ${certWarning}. No vas a poder emitir facturas con CAE hasta que lo renueves en AFIP y lo actualices aquí.`
                  : `⚠ Tu certificado digital de ARCA vence el ${certWarning}. Renovalo en AFIP antes de esa fecha para no interrumpir la emisión.`}
              </div>
            )}
            {arcaMsg && (
              <div className={`mb-3 p-3 rounded-lg text-sm border ${
                arcaState === "ok" ? "bg-green-900/30 border-green-700/40 text-green-200"
                : arcaState === "validating" ? "bg-blue-900/30 border-blue-700/40 text-blue-200"
                : arcaState === "error" ? "bg-red-900/30 border-red-700/40 text-red-300"
                : "bg-gray-800/60 border-gray-700/40 text-gray-200"
              }`}>
                {arcaState === "validating" && (
                  <span className="inline-flex mr-2">
                    <span className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
                {arcaMsg}
                {arcaState !== "validating" && (
                  <button onClick={() => setArcaMsg("")} className="float-right text-xs opacity-70 hover:opacity-100">✕</button>
                )}
              </div>
            )}
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-500 text-xs">CUIT del emisor</label>
                <input value={arca.arca_cuit} onChange={e => setArca({ ...arca, arca_cuit: e.target.value })} placeholder="Ej: 20332211224"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-gray-500 text-xs">Certificado digital (.pem)</label>
                <textarea value={arca.arca_cert} onChange={e => setArca({ ...arca, arca_cert: e.target.value })} rows={4} placeholder="Contenido del archivo cert.pem (dejalo vacío si ya lo cargaste)"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1 font-mono" />
              </div>
              <div>
                <label className="text-gray-500 text-xs">Clave privada (.pem)</label>
                <textarea value={arca.arca_key} onChange={e => setArca({ ...arca, arca_key: e.target.value })} rows={4} placeholder="Contenido del archivo key.pem"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs">Punto de venta</label>
                  <input type="number" value={arca.arca_punto_venta} onChange={e => setArca({ ...arca, arca_punto_venta: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Entorno</label>
                  <select value={arca.arca_env} onChange={e => setArca({ ...arca, arca_env: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm mt-1">
                    <option value="produccion">Producción</option>
                    <option value="homologacion">Homologación (pruebas)</option>
                  </select>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 bg-gray-900/50 border border-gray-800/40 rounded-lg p-3">
                ¿Dónde consigo el certificado? Ingresá a <strong>afip.gob.ar</strong> con tu CUIT y clave fiscal →
                <strong> Web Services → Administrador de Certificados</strong> y generá el certificado para el servicio <strong>wsfe</strong>.
              </div>
              <button onClick={handleArcaSave} disabled={arcaState === "validating"}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/60 disabled:cursor-wait text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
                {arcaState === "validating" && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {arcaState === "validating" ? "Validando con ARCA…" : user.arca_configurado ? "Reconectar certificado" : "Validar y conectar con ARCA"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Programa de referidos</h2>
        <p className="text-xs text-gray-500 mb-4">Invitá a un amigo y ganá $3.000 de crédito cada uno. Compartí tu código:</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm font-mono text-blue-400">{referido.codigo || "Cargando..."}</div>
          <button onClick={() => { navigator.clipboard.writeText(referido.codigo); setMsg("Código copiado"); setTimeout(() => setMsg(""), 2000); }} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl">Copiar</button>
        </div>
        {referido.total_referidos > 0 && (
          <p className="text-xs text-green-400">✓ {referido.total_referidos} referido{referido.total_referidos > 1 ? "s" : ""} · ${referido.creditos_ganados.toLocaleString()} créditos ganados</p>
        )}
        <div className="mt-4 pt-4 border-t border-gray-800/40">
          <p className="text-xs text-gray-500 mb-2">¿Tenés un código?</p>
          <div className="flex items-center gap-3">
            <input value={codigoInput} onChange={e => setCodigoInput(e.target.value.toUpperCase())} placeholder="CÓDIGO"
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm font-mono" />
            <button onClick={async () => {
              if (!codigoInput) return;
              const token = localStorage.getItem("token");
              const res = await fetch(`${BASE_URL}/api/auth/referido/aplicar`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ codigo: codigoInput }),
              }).then(r => r.json());
              if (res.ok) { setMsg("✓ Código aplicado. Recibiste $3.000 de crédito"); setCodigoInput(""); }
              else { setMsg(`❌ ${res.detail || "Código inválido"}`); }
              setTimeout(() => setMsg(""), 3000);
            }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">Aplicar</button>
          </div>
        </div>
      </div>

      {confirmDeleteLogo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-2">Eliminar logo</h3>
            <p className="text-xs text-gray-400 mb-5">¿Seguro que querés eliminar tu logo? Se mostrará "TraceLess" en las facturas.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteLogo(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">Cancelar</button>
              <button onClick={handleDeleteLogo} className="px-4 py-2 text-xs bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
