import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResent(false);
    setSending(true);
    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem("token", res.token);
      localStorage.setItem("refresh_token", res.refresh_token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Email o contraseña incorrectos");
    }
    setSending(false);
  };

  const resendVerification = async () => {
    if (!email) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then(r => r.json());
      setResent(true);
      setError(res.mensaje || "Revisá tu casilla de correo");
    } catch {
      setError("Error al reenviar la verificación");
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <p className="text-gray-400 text-sm mt-2">Iniciar sesión</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required disabled={sending}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required disabled={sending}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-blue-400">¿Olvidaste tu contraseña?</Link>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {error?.toLowerCase().includes("verificado") && !resent && (
            <button type="button" onClick={resendVerification} disabled={sending}
              className="w-full text-xs text-blue-400 hover:underline text-center disabled:opacity-50">
              {sending ? "Enviando..." : "Reenviar verificación"}
            </button>
          )}
          <button type="submit" disabled={sending} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Ingresando...
              </>
            ) : "Ingresar"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tenés cuenta? <Link to="/register" className="text-blue-400 hover:underline">Crear cuenta</Link>
        </p>
        <p className="text-center text-xs text-gray-600 mt-2">
          <Link to="/contact" className="hover:text-blue-400">Contacto y soporte</Link>
        </p>
      </div>
    </div>
  );
}
