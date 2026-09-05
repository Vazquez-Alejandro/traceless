import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import PasswordInput from "../components/PasswordInput";
import { getPricing, formatARS } from "../pricing";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

const PLANES = [
  { key: "free", name: "Gratis", price: "$0", desc: "20 facturas/mes", color: "border-gray-600" },
  { key: "pro", name: "Profesional", price: "price_pro", desc: "Ilimitado + WhatsApp", color: "border-purple-500", highlighted: true },
  { key: "team", name: "Equipo", price: "price_team", desc: "Hasta 5 usuarios + Facturá por WhatsApp", color: "border-yellow-500" },
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [pricing, setPricing] = useState<Record<string, { label: string; label_ars: string; ars: number }>>({});
  useEffect(() => {
    getPricing().then((p) => {
      if (p && p.prices) setPricing({ pro: p.prices.pro, team: p.prices.team });
    });
  }, []);

  const priceFor = (key: string) => {
    if (key === "free") return "$0";
    const ref = pricing[key === "pro" ? "pro" : "team"];
    if (!ref) return key === "pro" ? "USD 12" : "USD 18";
    return `${ref.label}/mes`;
  };
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralPromo, setReferralPromo] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  const codeParam = searchParams.get("code");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(planParam);
  const navigate = useNavigate();

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = passwordChecks.length && passwordChecks.upper && passwordChecks.number;

  // Auto-fill referral code from URL
  useState(() => {
    if (codeParam) {
      setReferralCode(codeParam.toUpperCase());
      validateReferralCode(codeParam.toUpperCase());
    }
  });

  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferralValid(null);
      setReferralPromo("");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/referrals/validate/${code}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setReferralValid(true);
        setReferralPromo(data.promo_description);
      } else {
        setReferralValid(false);
        setReferralPromo("");
      }
    } catch {
      setReferralValid(false);
      setReferralPromo("");
    }
  };

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
      const signupRes = await api.auth.signup({
        email,
        password,
        name,
        referral_code: referralCode || undefined,
      });
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
      if (res.refresh_token) localStorage.setItem("refresh_token", res.refresh_token);

      // Apply referral code if valid
      if (referralValid && referralCode) {
        try {
          await fetch(`${BASE_URL}/api/referrals/apply`, {
            method: "POST",
            headers: { Authorization: `Bearer ${res.token}` },
          });
        } catch (e) {
          console.error("Error applying referral:", e);
        }
      }

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
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
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
                <div className="text-lg font-bold text-right">
                  {priceFor(p.key)}
                  {p.price !== "$0" && (
                    <div className="text-[10px] font-normal text-gray-500">
                      ≈ {formatARS(pricing[p.key]?.ars ?? 0)}
                    </div>
                  )}
                </div>
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
            {selectedPlan !== "free" ? `Plan ${planName} — ${priceFor(selectedPlan)}` : "Crear cuenta gratuita"}
          </p>
          <button onClick={() => setSelectedPlan(null)} className="text-xs text-blue-400 hover:underline mt-1">← Cambiar plan</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required disabled={loading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          <div>
            <PasswordInput value={password} onChange={setPassword} disabled={loading} />
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
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Repetir contraseña" disabled={loading}
            className={confirmPassword && password !== confirmPassword ? "[&_input]:border-red-500" : ""} />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-red-400 text-[10px] -mt-2">Las contraseñas no coinciden</p>
          )}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Código de referido (opcional)"
                value={referralCode}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  setReferralCode(val);
                  validateReferralCode(val);
                }}
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 uppercase"
              />
              {referralValid === true && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
              )}
              {referralValid === false && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-sm">✕</span>
              )}
            </div>
            {referralValid === true && referralPromo && (
              <p className="text-green-400 text-[10px] mt-1">🎁 {referralPromo}</p>
            )}
            {referralValid === false && referralCode && (
              <p className="text-red-400 text-[10px] mt-1">Código no válido o ya utilizado</p>
            )}
          </div>
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
            : "20 facturas por mes. Sin tarjeta."}
        </p>
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta? <Link to="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
