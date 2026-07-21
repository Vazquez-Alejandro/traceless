import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMensaje("Token de verificación no encontrado.");
      return;
    }
    fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus("success");
          setMensaje(data.mensaje || "Email verificado correctamente");
        } else {
          setStatus("error");
          setMensaje(data.detail || data.mensaje || "Error al verificar el email");
        }
      })
      .catch(() => {
        setStatus("error");
        setMensaje("Error de conexión al verificar el email.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link to="/" className="text-2xl font-bold">TraceLess</Link>
        <div className="mt-8 p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
          {status === "loading" ? (
            <>
              <div className="text-3xl mb-4">⏳</div>
              <h2 className="text-lg font-semibold mb-2">Verificando...</h2>
              <p className="text-sm text-gray-400">Estamos verificando tu email.</p>
            </>
          ) : status === "success" ? (
            <>
              <div className="text-3xl mb-4">✅</div>
              <h2 className="text-lg font-semibold mb-2">Email verificado</h2>
              <p className="text-sm text-gray-400 mb-4">Tu cuenta está lista. Ya podés iniciar sesión.</p>
              <Link to="/login" className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">
                Iniciar sesión
              </Link>
            </>
          ) : (
            <>
              <div className="text-3xl mb-4">❌</div>
              <h2 className="text-lg font-semibold mb-2">Error de verificación</h2>
              <p className="text-sm text-gray-400 mb-4">{mensaje}</p>
              <Link to="/login" className="text-sm text-blue-400 hover:underline">Volver al login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
