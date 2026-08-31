import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_COMPLETOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface EventoCalendario {
  id: string;
  tipo: "factura" | "recurrente" | "monotributo" | "vencimiento";
  titulo: string;
  cliente: string;
  monto: number;
  fecha: string;
  estado: string;
}

export default function Calendario() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`${BASE_URL}/api/facturas?limit=200`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ facturas: [] })),
      fetch(`${BASE_URL}/api/facturas/recurrentes`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ recurrentes: [] })),
    ]).then(([fRes, rRes]) => {
      const evs: EventoCalendario[] = [];
      const facturas = fRes.facturas || [];
      facturas.forEach((f: any) => {
        if (f.estado === "anulada") return;
        const venc = f.vencimiento || f.fecha;
        if (!venc) return;
        evs.push({
          id: f.id,
          tipo: f.estado === "vencida" ? "vencimiento" : "factura",
          titulo: `Factura ${f.numero}`,
          cliente: `${f.clientes?.nombre || ""} ${f.clientes?.apellido || ""}`.trim(),
          monto: f.total,
          fecha: venc,
          estado: f.estado,
        });
      });
      const recurrentes = rRes.recurrentes || [];
      recurrentes.forEach((r: any) => {
        if (!r.proxima) return;
        evs.push({
          id: `rec-${r.descripcion || "recurrente"}`,
          tipo: "recurrente",
          titulo: r.descripcion || "Recurrente",
          cliente: "",
          monto: r.importe || 0,
          fecha: r.proxima,
          estado: "pendiente",
        });
      });
      evs.push({
        id: "monotributo",
        tipo: "monotributo",
        titulo: "Vto. Monotributo",
        cliente: "",
        monto: 0,
        fecha: `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-20`,
        estado: "pendiente",
      });
      setEventos(evs);
      setLoading(false);
    });
  }, [mesActual, anioActual]);

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDia = new Date(anioActual, mesActual, 1).getDay();
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);

  const eventosPorDia = (dia: number) => {
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return eventos.filter(e => e.fecha === fechaStr);
  };

  const totalCobrar = eventos.filter(e => e.fecha >= `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-01` && e.fecha <= `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-${diasEnMes}` && e.tipo !== "monotributo").reduce((acc, e) => acc + e.monto, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Calendario financiero</h1>
          <Link to="/dashboard" className="text-xs text-gray-400 hover:text-white">← Volver</Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40 text-center">
            <div className="text-lg font-bold text-green-400">${totalCobrar.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">Cobro esperado</div>
          </div>
          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40 text-center">
            <div className="text-lg font-bold text-blue-400">{eventos.filter(e => e.tipo === "factura").length}</div>
            <div className="text-[10px] text-gray-500">Facturas pendientes</div>
          </div>
          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40 text-center">
            <div className="text-lg font-bold text-yellow-400">{eventos.filter(e => e.tipo === "recurrente").length}</div>
            <div className="text-[10px] text-gray-500">Recurrentes</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { if (mesActual === 0) { setMesActual(11); setAnioActual(anioActual - 1); } else setMesActual(mesActual - 1); }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">←</button>
          <h2 className="text-sm font-semibold">{MESES_COMPLETOS[mesActual]} {anioActual}</h2>
          <button onClick={() => { if (mesActual === 11) { setMesActual(0); setAnioActual(anioActual + 1); } else setMesActual(mesActual + 1); }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
            <div key={d} className="text-center text-[10px] text-gray-500 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: primerDia }).map((_, i) => <div key={`empty-${i}`} />)}
          {dias.map(dia => {
            const evs = eventosPorDia(dia);
            const esHoy = dia === new Date().getDate() && mesActual === new Date().getMonth() && anioActual === new Date().getFullYear();
            return (
              <div key={dia} className={`min-h-[60px] p-1 rounded-lg border text-xs ${esHoy ? "border-blue-500 bg-blue-900/20" : "border-gray-800/30 bg-gray-900/20"} ${evs.length > 0 ? "cursor-pointer hover:bg-gray-800/40" : ""}`}>
                <div className={`text-[10px] mb-0.5 ${esHoy ? "text-blue-400 font-bold" : "text-gray-500"}`}>{dia}</div>
                {evs.slice(0, 2).map((ev, i) => (
                  <div key={i} className={`text-[8px] truncate rounded px-0.5 py-0.5 mb-0.5 ${ev.tipo === "monotributo" ? "bg-yellow-900/40 text-yellow-300" : ev.tipo === "recurrente" ? "bg-purple-900/40 text-purple-300" : ev.estado === "vencida" ? "bg-red-900/40 text-red-300" : "bg-green-900/40 text-green-300"}`}>
                    {ev.tipo === "monotributo" ? "Monotributo" : ev.tipo === "recurrente" ? ev.titulo : `$${ev.monto.toLocaleString()}`}
                  </div>
                ))}
                {evs.length > 2 && <div className="text-[8px] text-gray-500">+{evs.length - 2}</div>}
              </div>
            );
          })}
        </div>

        {eventos.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">Próximos vencimientos</h3>
            <div className="space-y-2">
              {eventos.sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8).map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ev.tipo === "monotributo" ? "bg-yellow-400" : ev.tipo === "recurrente" ? "bg-purple-400" : ev.estado === "vencida" ? "bg-red-400" : "bg-green-400"}`} />
                    <span className="text-gray-300">{ev.titulo}{ev.cliente ? ` — ${ev.cliente}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{ev.fecha.split("-")[2]}/{ev.fecha.split("-")[1]}</span>
                    {ev.monto > 0 && <span className="text-white font-medium">${ev.monto.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
