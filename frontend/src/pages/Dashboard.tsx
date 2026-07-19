import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

interface ClienteAnalytics {
  cliente: string;
  total: number;
  pagadas_tiempo: number;
  pagadas_vencidas: number;
  impagas: number;
  atraso_promedio: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState({ clientes: 0, facturas: 0, total: 0, emitidas: 0, por_cobrar: 0, pagadas: 0 });
  const [plan, setPlan] = useState("Gratis");
  const [mensual, setMensual] = useState<{mes: string; total: number}[]>([]);
  const [clientesAnalytics, setClientesAnalytics] = useState<ClienteAnalytics[]>([]);
  const maxTotal = Math.max(...mensual.map(m => m.total), 1);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    Promise.all([
      api.clientes.list(),
      api.facturas.list(),
      fetch(`${BASE_URL}/api/facturas/estadisticas`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/facturas/analytics/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/planes`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ]).then(([c, f, e, a, p]) => {
      const facturas = f.facturas || [];
      setStats({
        clientes: (c.clientes || []).length,
        facturas: facturas.length,
        total: facturas.reduce((s: number, f: any) => s + (f.total || 0), 0),
        emitidas: e.emitidas || 0,
        por_cobrar: e.por_cobrar || 0,
        pagadas: e.pagadas || 0,
      });
      setPlan(p.plan_actual || "Gratis");
      setClientesAnalytics(a.clientes || []);

      const mesesMap: Record<string, number> = {};
      facturas.forEach((f: any) => {
        if (f.fecha) {
          const m = f.fecha.slice(0, 7);
          mesesMap[m] = (mesesMap[m] || 0) + (f.total || 0);
        }
      });
      setMensual(Object.entries(mesesMap)
        .map(([mes, total]) => ({ mes, total }))
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .slice(-6));
    });
  }, []);

  const handleUpgrade = async (planKey: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/checkout/${planKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <div>
      {plan === "Gratis" && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Plan Gratis</p>
            <p className="text-xs text-gray-400">3 facturas por mes · Sin WhatsApp</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleUpgrade("basic")} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">Actualizar</button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Clientes", value: stats.clientes, to: "/clientes", color: "border-blue-500" },
          { label: "Por cobrar", value: stats.por_cobrar, to: "/facturas", color: "border-yellow-500" },
          { label: "Pagadas", value: stats.pagadas, to: "/facturas", color: "border-green-500" },
          { label: "Total facturado", value: `$${stats.total.toLocaleString()}`, to: "/facturas", color: "border-purple-500" },
        ].map((s, i) => (
          <Link key={i} to={s.to} className={`p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40 border-t-4 ${s.color} hover:bg-gray-900/60 transition-all`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {mensual.length > 0 && (
        <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-8">
          <h2 className="text-sm font-semibold mb-4 text-gray-300">Facturación mensual</h2>
          <div className="flex items-end gap-3 h-32">
            {mensual.map((m, i) => {
              const pct = m.total / maxTotal;
              const parts = m.mes.split("-");
              const label = `${MESES[parseInt(parts[1]) - 1]} ${parts[0].slice(2)}`;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">${m.total.toLocaleString()}</span>
                  <div className="w-full rounded-lg bg-blue-600/60 transition-all" style={{ height: `${Math.max(pct * 100, 4)}%` }} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {clientesAnalytics.length > 0 && (
        <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 mb-8">
          <h2 className="text-sm font-semibold mb-4 text-gray-300">Comportamiento de pagos por cliente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800/40">
                  <th className="text-left py-2 pr-4">Cliente</th>
                  <th className="text-right py-2 pr-4">Facturas</th>
                  <th className="text-right py-2 pr-4">Pagó a tiempo</th>
                  <th className="text-right py-2 pr-4">Pagó vencido</th>
                  <th className="text-right py-2 pr-4">Impagas</th>
                  <th className="text-right py-2">Atraso prom.</th>
                </tr>
              </thead>
              <tbody>
                {clientesAnalytics.map((c, i) => (
                  <tr key={i} className="border-b border-gray-900/40 hover:bg-gray-900/20">
                    <td className="py-2 pr-4 text-white font-medium">{c.cliente}</td>
                    <td className="py-2 pr-4 text-right">{c.total}</td>
                    <td className="py-2 pr-4 text-right text-green-400">{c.pagadas_tiempo}</td>
                    <td className="py-2 pr-4 text-right text-yellow-400">{c.pagadas_vencidas}</td>
                    <td className="py-2 pr-4 text-right text-red-400">{c.impagas}</td>
                    <td className="py-2 text-right">{c.atraso_promedio > 0 ? `${c.atraso_promedio} días` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Link to="/facturas" className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">Nueva Factura</Link>
        <Link to="/clientes" className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm">Nuevo Cliente</Link>
      </div>
    </div>
  );
}
