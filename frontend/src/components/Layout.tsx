import { Link } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-full mx-auto flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="font-bold text-lg">TraceLess</Link>
            <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/clientes" className="text-sm text-gray-400 hover:text-white">Clientes</Link>
            <Link to="/facturas" className="text-sm text-gray-400 hover:text-white">Facturas</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/perfil" className="text-sm text-gray-400 hover:text-white">Mi Perfil</Link>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Salir</button>
          </div>
        </div>
      </nav>
      <main className="max-w-full mx-auto px-6 py-8 flex-1">{children}</main>
      <footer className="border-t border-gray-800/30 py-6">
        <div className="max-w-full mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>TraceLess — © 2026</span>
          <div className="flex items-center gap-4">
            <Link to="/terminos" className="hover:text-gray-400">Términos</Link>
            <Link to="/privacidad" className="hover:text-gray-400">Privacidad</Link>
            <span>Contacto: hola@traceless.com.ar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
