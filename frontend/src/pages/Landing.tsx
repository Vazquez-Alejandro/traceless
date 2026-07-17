import { Link } from "react-router-dom";

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
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-gray-600">
          TraceLess — © 2026
        </div>
      </footer>
    </div>
  );
}
