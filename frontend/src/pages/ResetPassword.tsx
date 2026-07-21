import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
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
    const token = searchParams.get("access_token") || searchParams.get("token") || "";
    if (!token) {
      setError("Token inválido. Pedí un nuevo link de recuperación.");
      return;
    }
    localStorage.setItem("token", token);
    const res = await api.auth.resetPassword(password);
    if (res.error) {
      setError("Error al actualizar la contraseña. Pedí un nuevo link.");
    } else {
      setDone(true);
    }
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
          <input type="password" placeholder="Nueva contraseña" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input type="password" placeholder="Repetir contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">
            Guardar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}
