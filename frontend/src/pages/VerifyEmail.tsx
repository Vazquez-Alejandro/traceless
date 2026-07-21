import { Link, useSearchParams } from "react-router-dom";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link to="/" className="text-2xl font-bold">TraceLess</Link>
        <div className="mt-8 p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
          {error ? (
            <>
              <div className="text-3xl mb-4">❌</div>
              <h2 className="text-lg font-semibold mb-2">Error de verificación</h2>
              <p className="text-sm text-gray-400 mb-4">El link de verificación no es válido o ya expiró.</p>
              <Link to="/login" className="text-sm text-blue-400 hover:underline">Volver al login</Link>
            </>
          ) : (
            <>
              <div className="text-3xl mb-4">✉️</div>
              <h2 className="text-lg font-semibold mb-2">Email verificado</h2>
              <p className="text-sm text-gray-400 mb-4">Tu cuenta está lista. Ya podés iniciar sesión.</p>
              <Link to="/login" className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
