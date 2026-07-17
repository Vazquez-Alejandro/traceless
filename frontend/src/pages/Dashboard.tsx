import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Dashboard() {
  const [stats, setStats] = useState({ clientes: 0, facturas: 0, total: 0 });

  useEffect(() => {
    Promise.all([api.clientes.list(), api.facturas.list()]).then(([c, f]) => {
      const facturas = f.facturas || [];
      setStats({
        clientes: (c.clientes || []).length,
        facturas: facturas.length,
        total: facturas.reduce((s: number, f: any) => s + (f.total || 0), 0),
      });
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Clientes", value: stats.clientes, to: "/clientes", color: "border-blue-500" },
          { label: "Facturas emitidas", value: stats.facturas, to: "/facturas", color: "border-green-500" },
          { label: "Total facturado", value: `$${stats.total.toLocaleString()}`, to: "/facturas", color: "border-purple-500" },
        ].map((s, i) => (
          <Link key={i} to={s.to} className={`p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 border-t-4 ${s.color} hover:bg-gray-900/60 transition-all`}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-gray-400 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="flex gap-4">
        <Link to="/facturas" className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm">Nueva Factura</Link>
        <Link to="/clientes" className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm">Nuevo Cliente</Link>
      </div>
    </div>
  );
}
