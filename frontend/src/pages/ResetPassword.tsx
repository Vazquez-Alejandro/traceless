import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const token = searchParams.get("token") || "";
    if (!token) {
      setError("Token inválido. Pedí un nuevo link de recuperación.");
      return;
    }
    setLoading(true);
    const res = await api.auth.resetPassword(token, password);
    if (res.error) {
      setError("Error al actualizar la contraseña. Pedí un nuevo link.");
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <div className="mt-8 p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <div className="text-3xl mb-4">✅</div>
            <h2 className="text-lg font-semibold mb-2">Contraseña actualizada</h2>
            <p className="text-sm text-gray-400 mb-4">Ya podés iniciar sesión con tu nueva contraseña.</p>
            <Link to="/login" className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <p className="text-gray-400 text-sm mt-2">Nueva contraseña</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" placeholder="Nueva contraseña" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          <input type="password" placeholder="Repetir contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={loading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Guardando...
              </>
            ) : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
