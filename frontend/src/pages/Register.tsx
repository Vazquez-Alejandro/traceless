import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "free";
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <p className="text-gray-400 text-sm mt-2">Creá tu cuenta en 30 segundos</p>
          {selectedPlan !== "free" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-medium text-blue-400 mt-3">
              Plan {selectedPlan === "basic" ? "Básico" : selectedPlan === "pro" ? "Pro" : selectedPlan === "pyme" ? "PyME" : "Corporativo"} — Prueba 7 días gratis
            </div>
          )}
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
            {selectedPlan !== "free" ? "Crear cuenta y empezar prueba" : "Empezar Gratis"}
          </button>
        </form>
        <p className="text-center text-[11px] text-gray-600 mt-4">
          {selectedPlan !== "free" 
            ? "Sin tarjeta. Cancelá cuando quieras."
            : "3 facturas por mes. Sin tarjeta."}
        </p>
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta? <Link to="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
