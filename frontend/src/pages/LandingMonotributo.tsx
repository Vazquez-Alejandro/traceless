import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function LandingMonotributo() {
  useEffect(() => {
    document.title = "Factura Monotributo AFIP en 1 clic | TraceLess";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Emití facturas C y E como monotributista con CAE real de ARCA y envialas por WhatsApp en 1 clic. Sin entrar a AFIP. Plan gratis 20 facturas/mes.");
  }, []);

  const faqs = [
    { q: "¿Puedo facturar como monotributista con TraceLess?", a: "Sí. Con tu CUIT y certificado digital emitís facturas C y E con CAE real de ARCA. TraceLess valida el CAE y te da el PDF con QR." },
    { q: "¿Necesito entrar a ARCA/AFIP?", a: "No. Una vez conectado tu CUIT y certificado, emitís desde TraceLess sin entrar a ARCA. Nosotros pedimos el CAE por vos." },
    { q: "¿La factura llega por WhatsApp?", a: "Sí. Al emitir, se envía automáticamente por WhatsApp Cloud API a tu cliente con el link de pago. En plan Gratis va por wa.me." },
    { q: "¿Me avisa del vencimiento del monotributo?", a: "Sí. El día 20 de cada mes te llega recordatorio por WhatsApp si estás en plan pago. Lo podés activar o desactivar desde Mi Perfil." },
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
            🇦🇷 Para monotributistas argentinos
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-4">
            Factura Monotributo AFIP
            <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent"> en 1 clic.</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400 leading-relaxed mb-6 max-w-xl mx-auto">
            Emití facturas <strong className="text-gray-200">C y E con CAE real de ARCA</strong> sin entrar a AFIP. Se envía por WhatsApp con link de pago y te avisa si no te pagan. <strong className="text-gray-200">20 facturas gratis por mes.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 text-sm">
              Empezar Gratis — Sin tarjeta
            </Link>
          </div>
          <p className="text-[10px] text-gray-600 mt-3">Conectás tu CUIT y certificado una vez. Después facturás en segundos.</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Monotributo sin entrar a ARCA</h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto text-sm">Dejá de perder tardes en AFIP. TraceLess hace el trámite por vos.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🧾", title: "Factura C y E con CAE", desc: "Con validez ARCA. CAE y numeración automática. Vista previa antes de emitir." },
              { icon: "📱", title: "WhatsApp automático", desc: "Tu cliente la recibe en el celu con link de pago. Sin PDF adjunto." },
              { icon: "⏰", title: "Aviso día 20", desc: "Recordatorio de cuota del monotributo para que no pagues recargo." },
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Preguntas de monotributistas</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Probalo gratis hoy</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">20 facturas/mes gratis para siempre. En 5 minutos tenés tu primera factura C con CAE.</p>
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
