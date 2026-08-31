import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function LandingPyme() {
  useEffect(() => {
    document.title = "Facturación Electrónica para PyMEs | TraceLess";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Facturación electrónica para pymes argentinas. Emití facturas A, B y C con CAE de ARCA y envialas por WhatsApp. Sin software caro. Desde $12 USD/mes.");
  }, []);

  const faqs = [
    { q: "¿Puedo emitir facturas A y B como pyme?", a: "Sí. Con tu CUIT y condición IVA (Responsable Inscripto o Monotributo) emitís facturas A, B o C según el tipo de cliente." },
    { q: "¿Necesito contratar un contador para facturar?", a: "No. TraceLess te guía paso a paso. Elegís el tipo de factura, cargás los datos y se emite con CAE válido automáticamente." },
    { q: "¿El sistema acepta todos los tipos de factura?", a: "Sí. Factura A (RI), B (RI con consumidor final), C (monotributo), A y B de venta con commit (crédito fiscal) y D/C por notas de crédito." },
    { q: "¿Puedo enviar facturas a mis clientes por WhatsApp?", a: "Sí. Cada factura se envía automáticamente por WhatsApp con link de pago para cobro presencial o online." },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <img src="/logonegro.svg" alt="TraceLess" className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex-shrink-0" />
            <span className="font-bold text-base sm:text-lg truncate">TraceLess</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <Link to="/login" className="text-[11px] sm:text-xs text-gray-400 hover:text-white whitespace-nowrap ml-2 sm:ml-3">Iniciar Sesión</Link>
            <Link to="/register" className="inline-flex items-center justify-center text-center px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-semibold rounded-lg whitespace-nowrap leading-none">Empezar Gratis</Link>
          </div>
        </div>
      </nav>

      <section className="flex items-center justify-center px-4 pt-16 pb-12">
        <div className="text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-medium text-blue-400 mb-6">
            🏢 Para PyMEs argentinas
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-4">
            Facturación Electrónica
            <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent"> para PyMEs.</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400 leading-relaxed mb-6 max-w-xl mx-auto">
            Emití facturas <strong className="text-gray-200">A, B y C con CAE de ARCA</strong> en segundos. Enviás por WhatsApp, cobrás con link y controlás todo desde el celular. <strong className="text-gray-200">Desde $12 USD/mes.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 text-sm">
              Empezar Gratis — Sin tarjeta
            </Link>
          </div>
          <p className="text-[10px] text-gray-600 mt-3">Sin instalación, sin software, sin contrato. Solo entrás y facturás.</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Todo lo que tu pyme necesita</h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto text-sm">Facturación completa sin software complicado ni costos escondidos.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🧾", title: "Facturas A, B y C", desc: "Todos los tipos de factura con CAE válido de ARCA. Numeración automática." },
              { icon: "📱", title: "WhatsApp automático", desc: "Se envía al instante con link de pago para cobro online o presencial." },
              { icon: "📊", title: "Dashboard completo", desc: "Resumen de ventas, clientes, vencimientos y cuota del monotributo." },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40 text-center">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-gray-900/20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Preguntas de pymes</h2>
          <div className="space-y-4 mt-8">
            {faqs.map((f, i) => (
              <div key={i} className="p-5 rounded-2xl bg-gray-900/40 border border-gray-800/40">
                <h3 className="text-sm font-semibold mb-1.5">{f.q}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-gradient-to-b from-gray-900/20 to-gray-950">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Empezá a facturar hoy</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">20 facturas/mes gratis. Sin tarjeta, sin contrato. En 5 minutos tenés tu primera factura.</p>
          <Link to="/register" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 text-sm">
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-800/30 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>TraceLess — © 2026</span>
          <div className="flex items-center gap-4">
            <Link to="/terminos" className="hover:text-gray-400">Términos</Link>
            <Link to="/privacidad" className="hover:text-gray-400">Privacidad</Link>
            <Link to="/contact" className="hover:text-gray-400">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
