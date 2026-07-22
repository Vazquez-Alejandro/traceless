import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Onboarding from "./Onboarding";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("onboarding_done");
    if (!done) setShowOnboarding(true);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("onboarding_done");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-full mx-auto flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="TraceLess" className="w-7 h-7 rounded-lg" />
              <span className="font-bold text-lg">TraceLess</span>
            </Link>
            <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/clientes" className="text-sm text-gray-400 hover:text-white">Clientes</Link>
            <Link to="/facturas" className="text-sm text-gray-400 hover:text-white">Facturas</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/contact" className="text-sm text-gray-400 hover:text-white">Soporte</Link>
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
            <Link to="/contact" className="hover:text-gray-400">Contacto</Link>
            <span>soporte@traceless.com.ar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
