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
    key: "basic",
    name: "Básico",
    price: "$5/mes",
    desc: "Para freelancers que empiezan",
    features: ["50 facturas por mes", "WhatsApp incluido", "1 usuario"],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$12/mes",
    desc: "Para profesionales activos",
    features: ["Facturas ilimitadas", "WhatsApp incluido", "1 usuario"],
    highlighted: true,
  },
  {
    key: "pyme",
    name: "PyME",
    price: "$15/mes",
    desc: "Para pequeños equipos",
    features: ["Facturas ilimitadas", "WhatsApp incluido", "Hasta 3 usuarios"],
    highlighted: false,
  },
  {
    key: "corporate",
    name: "Corporativo",
    price: "$75/mes",
    desc: "Para estudios y empresas",
    features: ["Facturas ilimitadas", "WhatsApp incluido", "Usuarios ilimitados", "Soporte prioritario"],
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <span className="font-bold text-xl">TraceLess</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white">Iniciar Sesión</Link>
            <Link to="/register" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl">Comenzar Gratis</Link>
          </div>
        </div>
      </nav>

      <section className="flex items-center justify-center px-6 pt-28 pb-20">
        <div className="text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-medium text-blue-400 mb-8">
            Facturación inteligente para Argentina
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Gestioná tu negocio{" "}
            <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">
              sin rastro de papel
            </span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-xl mx-auto">
            Facturá a tus clientes, enviales el comprobante por WhatsApp y olvidate de los vencimientos.
            TraceLess es la herramienta que todo freelancer argentino necesita.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl shadow-xl shadow-blue-600/25">Comenzar Gratis</Link>
            <Link to="/login" className="w-full sm:w-auto px-8 py-3.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 font-medium rounded-2xl border border-gray-700/50">Iniciar Sesión</Link>
          </div>
        </div>
      </section>

      <section id="precios" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Planes simples, sin sorpresas</h2>
          <p className="text-gray-400 text-center mb-12 max-w-lg mx-auto">
            Empezá gratis y escalá cuando lo necesites. Pagás solo por lo que usás.
          </p>
          <div className="grid md:grid-cols-5 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className={`relative p-5 rounded-2xl border flex flex-col ${
                  p.highlighted
                    ? "bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-600/10"
                    : "bg-gray-900/40 border-gray-800/40"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 text-[10px] font-semibold rounded-full">
                    MÁS POPULAR
                  </div>
                )}
                <h3 className="text-base font-semibold mb-1">{p.name}</h3>
                <div className="text-2xl font-bold mb-1">{p.price}</div>
                <p className="text-xs text-gray-400 mb-4">{p.desc}</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-center gap-1.5">
                      <span className="text-blue-400">✓</span> {f}
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

      <section className="py-20 bg-gray-900/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "🧾", title: "Facturación ARCA", desc: "Generá facturas A, B, C y E con un clic. Sin formularios, sin complicaciones." },
              { icon: "📱", title: "Envío por WhatsApp", desc: "Tus facturas llegan directo al celular de tu cliente. Más rápido, más profesional." },
              { icon: "📅", title: "Recordatorios", desc: "Nunca más te olvidés de un vencimiento. Te avisamos por WhatsApp antes de cada fecha." },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800/30 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span>TraceLess — © 2026</span>
          <div className="flex gap-4">
            <Link to="/terminos" className="hover:text-gray-400">Términos</Link>
            <Link to="/privacidad" className="hover:text-gray-400">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
