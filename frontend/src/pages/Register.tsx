import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

const PLANES = [
  { key: "free", name: "Gratis", price: "$0", desc: "5 facturas/mes", color: "border-gray-600" },
  { key: "pro", name: "Profesional", price: "$15.000/mes", desc: "Ilimitado + WhatsApp", color: "border-purple-500", highlighted: true },
  { key: "team", name: "Equipo", price: "$29.000/mes", desc: "Hasta 5 usuarios", color: "border-yellow-500" },
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(planParam);
  const navigate = useNavigate();

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = passwordChecks.length && passwordChecks.upper && passwordChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedPlan) return;
    if (!passwordValid) {
      setError("La contraseña no cumple los requisitos");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!acceptTerms) {
      setError("Debés aceptar los Términos y Condiciones");
      return;
    }
    setLoading(true);
    try {
      const signupRes = await api.auth.signup({ email, password, name });
      if (signupRes.error) {
        setError(signupRes.error);
        return;
      }
      if (signupRes.user?.needs_verification) {
        setVerified(true);
        return;
      }
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
    setLoading(false);
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <div className="mt-8 p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-lg font-semibold mb-2">Revisá tu email</h2>
            <p className="text-sm text-gray-400 mb-4">
              Te enviamos un link de verificación a <span className="text-white font-medium">{email}</span>. Hacé clic en el link para activar tu cuenta.
            </p>
            <p className="text-xs text-gray-500">¿No te llegó? Revisá la carpeta de spam.</p>
          </div>
          <Link to="/login" className="inline-block mt-4 text-sm text-blue-400 hover:underline">Ir a iniciar sesión</Link>
        </div>
      </div>
    );
  }

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
          <input type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required disabled={loading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          <div>
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
            {password.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${passwordChecks.length ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                  {passwordChecks.length ? "✓" : "○"} 8+ caracteres
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${passwordChecks.upper ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                  {passwordChecks.upper ? "✓" : "○"} Mayúscula
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${passwordChecks.number ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                  {passwordChecks.number ? "✓" : "○"} Número
                </span>
              </div>
            )}
          </div>
          <input type="password" placeholder="Repetir contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={loading}
            className={`w-full px-4 py-3 bg-gray-900 border rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 ${confirmPassword && password !== confirmPassword ? "border-red-500" : "border-gray-800"}`} />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-red-400 text-[10px] -mt-2">Las contraseñas no coinciden</p>
          )}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
              disabled={loading}
              className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-xs text-gray-400">
              Acepto los{" "}
              <Link to="/terminos" target="_blank" className="text-blue-400 hover:underline">
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link to="/privacidad" target="_blank" className="text-blue-400 hover:underline">
                Política de Privacidad
              </Link>
            </span>
          </label>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Creando cuenta...
              </>
            ) : selectedPlan !== "free" ? "Crear cuenta y pagar" : "Empezar Gratis"}
          </button>
        </form>
        <p className="text-center text-[11px] text-gray-600 mt-4">
          {selectedPlan !== "free"
            ? "Pagás con Mercado Pago. Cancelá cuando quieras."
            : "5 facturas por mes. Sin tarjeta."}
        </p>
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta? <Link to="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
