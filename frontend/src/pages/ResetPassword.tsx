import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import PasswordInput from "../components/PasswordInput";

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
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe tener al menos una mayúscula");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("La contraseña debe tener al menos un número");
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
    try {
      const res = await api.auth.resetPassword(token, password);
      if (res.error) {
        setError(res.error);
      } else {
        setDone(true);
      }
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña. Intentá de nuevo.");
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
          <PasswordInput value={password} onChange={setPassword} placeholder="Nueva contraseña" disabled={loading} />
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repetir contraseña" disabled={loading} />
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
