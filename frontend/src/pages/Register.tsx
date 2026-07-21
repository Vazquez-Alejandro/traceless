import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

const PLANES = [
  { key: "free", name: "Gratis", price: "$0", desc: "3 facturas/mes", color: "border-gray-600" },
  { key: "basic", name: "Básico", price: "$8.500/mes", desc: "50 facturas + WhatsApp", color: "border-blue-500" },
  { key: "pro", name: "Pro", price: "$17.500/mes", desc: "Ilimitado + WhatsApp", color: "border-purple-500", highlighted: true },
  { key: "pyme", name: "PyME", price: "$27.000/mes", desc: "Para equipos", color: "border-yellow-500" },
  { key: "corporate", name: "Corporativo", price: "$92.000/mes", desc: "Todo incluido", color: "border-green-500" },
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(planParam);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedPlan) return;
    try {
      await api.auth.signup({ email, password, name });
      const res = await api.auth.login({ email, password });
      localStorage.setItem("token", res.token);
      if (selectedPlan !== "free") {
        const p = await fetch(`${BASE_URL}/api/mercadopago/checkout?plan_key=${selectedPlan}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${res.token}` },
        }).then(r => r.json());
        if (p.url) {
          window.location.href = p.url;
        } else {
          console.error("Checkout error:", p);
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    } catch {
      setError("Error al crear la cuenta");
    }
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold">TraceLess</Link>
            <p className="text-gray-400 text-sm mt-2">Elegí el plan que mejor se adapte a vos</p>
          </div>
          <div className="space-y-3">
            {PLANES.map(p => (
              <button
                key={p.key}
                onClick={() => setSelectedPlan(p.key)}
                className={`w-full p-4 rounded-xl border ${p.color} bg-gray-900/40 hover:bg-gray-900/70 transition-all text-left flex items-center justify-between`}
              >
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.desc}</div>
                </div>
                <div className="text-lg font-bold">{p.price}</div>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tenés cuenta? <Link to="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    );
  }

  const planName = PLANES.find(p => p.key === selectedPlan)?.name || selectedPlan;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <p className="text-gray-400 text-sm mt-2">
            {selectedPlan !== "free" ? `Plan ${planName} — ${PLANES.find(p => p.key === selectedPlan)?.price}` : "Crear cuenta gratuita"}
          </p>
          <button onClick={() => setSelectedPlan(null)} className="text-xs text-blue-400 hover:underline mt-1">← Cambiar plan</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">
            {selectedPlan !== "free" ? "Crear cuenta y pagar" : "Empezar Gratis"}
          </button>
        </form>
        <p className="text-center text-[11px] text-gray-600 mt-4">
          {selectedPlan !== "free"
            ? "Pagás con Mercado Pago. Cancelá cuando quieras."
            : "3 facturas por mes. Sin tarjeta."}
        </p>
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta? <Link to="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
