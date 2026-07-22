import { Link } from "react-router-dom";

const PLANS = [
  {
    key: "free",
    name: "Gratis",
    price: "Gratis",
    desc: "Para probar la plataforma",
    features: ["3 facturas por mes", "Sin WhatsApp", "1 usuario"],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Profesional",
    price: "$15.000/mes",
    desc: "Para freelancers y monotributistas",
    features: ["Facturas ilimitadas", "WhatsApp incluido", "Analytics de pagos", "Facturas recurrentes", "1 usuario"],
    highlighted: true,
  },
  {
    key: "team",
    name: "Equipo",
    price: "$29.000/mes",
    desc: "Para estudios y PyMEs",
    features: ["Todo del plan Profesional", "Hasta 5 usuarios", "Soporte prioritario", "Cola de reintentos ARCA"],
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <span className="flex items-center gap-2">
            <img src="/favicon.svg" alt="TraceLess" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-lg">TraceLess</span>
          </span>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs text-gray-400 hover:text-white">Iniciar Sesión</Link>
            <Link to="/register" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">Comenzar</Link>
          </div>
        </div>
      </nav>

      <section className="flex items-center justify-center px-4 pt-16 pb-12">
        <div className="text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-medium text-blue-400 mb-6">
            🇦🇷 Hecho para freelancers argentinos
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-4">
            Cobrá más rápido.{" "}
            <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">
              Facturá sin papel.
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400 leading-relaxed mb-6 max-w-xl mx-auto">
            Emití facturas con validez ARCA, envialas por WhatsApp al instante y recibí alertas
            cuando un cliente no paga.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 text-sm">
              Empezar Gratis — Sin tarjeta
            </Link>
          </div>
          <p className="text-[10px] text-gray-600 mt-3">5 facturas por mes. Sin tarjeta de crédito.</p>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Cómo funciona</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Creá tu cliente", desc: "Cargá sus datos una vez. Nombre, CUIT, teléfono. Después facturás en segundos." },
              { step: "2", title: "Emití la factura", desc: "Elegí tipo A, B o C. Los montos se calculan solos. Con items o sin items." },
              { step: "3", title: "Cobrá sin perseguir", desc: "La factura llega por WhatsApp al instante. Nosotros te recordamos si no paga." },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-lg font-bold text-blue-400">
                  {f.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-gray-900/20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Todo lo que necesitás para facturar bien</h2>
          <p className="text-gray-400 text-center mb-8 max-w-lg mx-auto text-sm">
            No es un ERP enorme. Es justo lo que un freelancer necesita para emitir, enviar y cobrar.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🧾", title: "Facturas A, B, C y E", desc: "Con validez ARCA. Números correlativos automáticos." },
              { icon: "📱", title: "Envío por WhatsApp", desc: "Llega al celular de tu cliente al instante. Sin adjuntar PDFs." },
              { icon: "📊", title: "Dashboard inteligente", desc: "Vé qué clientes pagan a tiempo y quiénes se atrasan siempre." },
              { icon: "🔄", title: "Facturas recurrentes", desc: "Se emiten solas cada mes. No te olvidés nunca más." },
              { icon: "⏰", title: "Recordatorios automáticos", desc: "WhatsApp semanal a los clientes que deben. Sin hacer nada." },
              { icon: "📎", title: "Links públicos", desc: "Compartí la factura por cualquier medio. Sin registro del cliente." },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 hover:border-gray-700/60 transition-all">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Planes simples, sin sorpresas</h2>
          <p className="text-gray-400 text-center mb-8 max-w-lg mx-auto text-sm">
            Empezá gratis. Upgrade cuando necesités más.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className={`relative p-5 rounded-2xl border flex flex-col ${
                  p.highlighted
                    ? "bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-600/10 scale-[1.02]"
                    : "bg-gray-900/40 border-gray-800/40"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 text-[10px] font-semibold rounded-full whitespace-nowrap">
                    RECOMENDADO
                  </div>
                )}
                <h3 className="text-base font-semibold mb-1">{p.name}</h3>
                <div className="text-2xl font-bold mb-1">{p.price}</div>
                <p className="text-xs text-gray-400 mb-4">{p.desc}</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-center gap-1.5">
                      <span className="text-blue-400 shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.key === "free" ? "/register" : `/register?plan=${p.key}`}
                  className={`block w-full text-center py-2 rounded-xl text-xs font-semibold ${
                    p.highlighted
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-gray-700/30"
                  }`}
                >
                  {p.key === "free" ? "Comenzar Gratis" : "Elegir Plan"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-gradient-to-b from-gray-900/20 to-gray-950">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Dejá de perseguir facturas</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">
            Probá TraceLess gratis. En 5 minutos tenés tu primera factura lista.
          </p>
          <Link to="/register" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 text-sm">
            Probar Gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-800/30 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>TraceLess — © 2026</span>
          <div className="flex items-center gap-4">
            <Link to="/terminos" className="hover:text-gray-400">Términos</Link>
            <Link to="/privacidad" className="hover:text-gray-400">Privacidad</Link>
            <span>hola@traceless.com.ar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
