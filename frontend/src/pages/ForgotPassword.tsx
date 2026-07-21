import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await api.auth.forgotPassword(email);
    if (res.error) {
      setError("Error al enviar el email");
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <div className="mt-8 p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <div className="text-3xl mb-4">📧</div>
            <h2 className="text-lg font-semibold mb-2">Email enviado</h2>
            <p className="text-sm text-gray-400 mb-4">
              Si <span className="text-white">{email}</span> está registrado, recibiste un link para restablecer tu contraseña.
            </p>
            <p className="text-xs text-gray-500">Revisá tu carpeta de spam si no lo ves.</p>
            <Link to="/login" className="inline-block mt-4 text-sm text-blue-400 hover:underline">Volver al login</Link>
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
          <p className="text-gray-400 text-sm mt-2">Recuperá tu contraseña</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Tu email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">
            Enviar link de recuperación
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-blue-400 hover:underline">Volver al login</Link>
        </p>
      </div>
    </div>
  );
}
