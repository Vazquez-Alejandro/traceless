import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem("token", res.token);
      localStorage.setItem("refresh_token", res.refresh_token);
      navigate("/dashboard");
    } catch {
      setError("Email o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <p className="text-gray-400 text-sm mt-2">Iniciar sesión</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">
            Ingresar
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tenés cuenta? <Link to="/register" className="text-blue-400 hover:underline">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
