import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Onboarding from "./Onboarding";
import { api } from "../api/client";

const TIPO_ICONS: Record<string, string> = {
  pago_recibido: "💰",
  factura_vencida: "⚠️",
  credito_bajo: "📉",
  plan_renovado: "✅",
  plan_cancelado: "❌",
  recordatorio: "📋",
  factura_programada: "📅",
  error: "🔴",
  info: "ℹ️",
};

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  enlace: string;
  created_at: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<Notificacion[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const done = localStorage.getItem("onboarding_done");
    if (!done) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api.notificaciones.count().then(res => setUnreadCount(res.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showNotifs) return;
    api.notificaciones.list(5, 0).then(res => setRecentNotifs(res.notificaciones || [])).catch(() => {});
  }, [showNotifs]);

  useEffect(() => {
    if (!showNotifs) return;
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotifs]);

  const handleNotifClick = async (n: Notificacion) => {
    if (!n.leida) {
      await api.notificaciones.markRead(n.id).catch(() => {});
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotifs(false);
    if (n.enlace) window.location.href = n.enlace;
  };

  const markAllRead = async () => {
    await api.notificaciones.markAllRead().catch(() => {});
    setUnreadCount(0);
    setRecentNotifs(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("onboarding_done");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-full mx-auto flex items-center justify-between h-14 px-4 md:px-6">
          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="TraceLess" className="w-7 h-7 rounded-lg" />
              <span className="font-bold text-lg">TraceLess</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">Dashboard</Link>
              <Link to="/clientes" className="text-sm text-gray-400 hover:text-white">Clientes</Link>
              <Link to="/facturas" className="text-sm text-gray-400 hover:text-white">Facturas</Link>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/contact" className="text-sm text-gray-400 hover:text-white">Soporte</Link>
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-1.5 text-gray-400 hover:text-white transition-colors" title="Notificaciones">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
                    <span className="text-sm font-semibold">Notificaciones</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:underline">Marcar todo leído</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">Sin notificaciones</div>
                    ) : (
                      recentNotifs.map(n => (
                        <button key={n.id} onClick={() => handleNotifClick(n)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-800/30 hover:bg-gray-800/40 transition-colors ${!n.leida ? "bg-blue-900/10" : ""}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0 mt-0.5">{TIPO_ICONS[n.tipo] || "ℹ️"}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{n.titulo}</div>
                              {n.mensaje && <div className="text-xs text-gray-400 truncate mt-0.5">{n.mensaje}</div>}
                              <div className="text-[10px] text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            {!n.leida && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <Link to="/notificaciones" onClick={() => setShowNotifs(false)}
                    className="block px-4 py-2.5 text-center text-xs text-blue-400 hover:bg-gray-800/40 border-t border-gray-800/60">
                    Ver todas
                  </Link>
                </div>
              )}
            </div>
            <Link to="/perfil" className="text-sm text-gray-400 hover:text-white">Mi Perfil</Link>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Salir</button>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-1.5 text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
                    <span className="text-sm font-semibold">Notificaciones</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:underline">Marcar todo leído</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">Sin notificaciones</div>
                    ) : (
                      recentNotifs.map(n => (
                        <button key={n.id} onClick={() => handleNotifClick(n)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-800/30 hover:bg-gray-800/40 transition-colors ${!n.leida ? "bg-blue-900/10" : ""}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0 mt-0.5">{TIPO_ICONS[n.tipo] || "ℹ️"}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{n.titulo}</div>
                              {n.mensaje && <div className="text-xs text-gray-400 truncate mt-0.5">{n.mensaje}</div>}
                              <div className="text-[10px] text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            {!n.leida && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <Link to="/notificaciones" onClick={() => setShowNotifs(false)}
                    className="block px-4 py-2.5 text-center text-xs text-blue-400 hover:bg-gray-800/40 border-t border-gray-800/60">
                    Ver todas
                  </Link>
                </div>
              )}
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-400 hover:text-white" aria-label="Menú">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-800/40 bg-gray-900/95 backdrop-blur-xl">
            <div className="px-4 py-3 space-y-2">
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-400 hover:text-white">Dashboard</Link>
              <Link to="/clientes" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-400 hover:text-white">Clientes</Link>
              <Link to="/facturas" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-400 hover:text-white">Facturas</Link>
              <Link to="/notificaciones" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-400 hover:text-white">Notificaciones</Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-400 hover:text-white">Soporte</Link>
              <Link to="/perfil" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-400 hover:text-white">Mi Perfil</Link>
              <button onClick={logout} className="block py-2 text-sm text-gray-400 hover:text-white">Salir</button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-full mx-auto px-4 md:px-6 py-8 flex-1">{children}</main>
      <footer className="border-t border-gray-800/30 py-6">
        <div className="max-w-full mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
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
