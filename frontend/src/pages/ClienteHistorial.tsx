import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

export default function ClienteHistorial() {
  const { id } = useParams();
  const [cliente, setCliente] = useState<any>(null);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;
    fetch(`${BASE_URL}/api/facturas/clientes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      setCliente(d.cliente);
      setFacturas(d.facturas || []);
      setResumen(d.resumen || {});
    });
  }, [id]);

  if (!cliente) return <p className="text-gray-400 text-sm py-8">Cargando...</p>;

  return (
    <div>
      <Link to="/clientes" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">← Volver a clientes</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{cliente.nombre} {cliente.apellido}</h1>
        <span className="text-xs text-gray-500">{cliente.cuit || cliente.email || cliente.telefono}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Facturas", value: resumen.total, color: "text-blue-400" },
          { label: "Facturado", value: `$${(resumen.total_facturado || 0).toLocaleString()}`, color: "text-purple-400" },
          { label: "Pagó a tiempo", value: resumen.pagadas_tiempo, color: "text-green-400" },
          { label: "Pagó vencido", value: resumen.pagadas_vencidas, color: resumen.pagadas_vencidas > 0 ? "text-yellow-400" : "text-gray-500" },
          { label: "Impagas", value: resumen.impagas, color: resumen.impagas > 0 ? "text-red-400" : "text-gray-500" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? "—"}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {resumen.atraso_promedio > 0 && (
        <div className="mb-6 p-3 rounded-xl bg-yellow-900/20 border border-yellow-700/30 text-sm text-yellow-300">
          ⚠️ Esta persona se atrasa en promedio {resumen.atraso_promedio} días en sus pagos.
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Historial de facturas</h2>
        {facturas.map(f => {
          const atraso = f.estado === "pagada" && f.fecha_pago && f.vencimiento
            ? (new Date(f.fecha_pago).getTime() - new Date(f.vencimiento).getTime()) / 86400000
            : null;
          return (
            <div key={f.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/40">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{f.numero}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  f.estado === "pagada" ? "bg-green-900/40 text-green-400" :
                  f.estado === "anulada" ? "bg-red-900/40 text-red-400" :
                  f.estado === "vencida" ? "bg-yellow-900/40 text-yellow-400" : "bg-blue-900/40 text-blue-400"
                }`}>
                  {f.estado === "pagada" ? "Pagada" : f.estado === "anulada" ? "Anulada" : f.estado === "vencida" ? "Vencida" : "Emitida"}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                ${f.total.toLocaleString()} · Emitida: {f.fecha} · Vence: {f.vencimiento || "—"}
                {f.fecha_pago && <span> · Pagada: {f.fecha_pago}</span>}
                {atraso !== null && atraso > 0 && <span className="text-yellow-400"> · {Math.round(atraso)} días de atraso</span>}
                {atraso !== null && atraso <= 0 && <span className="text-green-400"> · A tiempo</span>}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-500">
                {f.estado === "emitida" && <span className="text-blue-400">📄 Emitida {f.fecha}</span>}
                {f.fecha_pago && <span className="text-green-400">💚 Pagada {f.fecha_pago}</span>}
                {f.estado === "anulada" && <span className="text-red-400">🗑️ Anulada</span>}
              </div>
            </div>
          );
        })}
        {facturas.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Este cliente no tiene facturas aún.</p>}
      </div>
    </div>
  );
}
