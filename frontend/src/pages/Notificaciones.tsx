import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function Notificaciones() {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = (offset = 0) => {
    api.notificaciones.list(50, offset).then(res => {
      setNotifs(prev => offset === 0 ? (res.notificaciones || []) : [...prev, ...(res.notificaciones || [])]);
      setTotal(res.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleClick = async (n: Notificacion) => {
    if (!n.leida) {
      await api.notificaciones.markRead(n.id).catch(() => {});
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x));
    }
    if (n.enlace) navigate(n.enlace);
  };

  const markAllRead = async () => {
    await api.notificaciones.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.notificaciones.delete(id).catch(() => {});
    setNotifs(prev => prev.filter(n => n.id !== id));
    setTotal(prev => prev - 1);
  };

  const unreadCount = notifs.filter(n => !n.leida).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          {unreadCount > 0 && <p className="text-xs text-gray-500 mt-1">{unreadCount} sin leer</p>}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl">
              Marcar todo leído
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm text-center py-8">Cargando...</p>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔔</div>
          <p className="text-gray-400 text-sm">No tenés notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <button key={n.id} onClick={() => handleClick(n)}
              className={`w-full text-left p-4 rounded-xl border transition-all hover:bg-gray-900/60 ${!n.leida ? "bg-blue-900/10 border-blue-500/20" : "bg-gray-900/40 border-gray-800/40"}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{TIPO_ICONS[n.tipo] || "ℹ️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{n.titulo}</span>
                    {!n.leida && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </div>
                  {n.mensaje && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.mensaje}</p>}
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    {new Date(n.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={(e) => handleDelete(e, n.id)} className="text-gray-600 hover:text-red-400 p-1 flex-shrink-0" title="Eliminar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
