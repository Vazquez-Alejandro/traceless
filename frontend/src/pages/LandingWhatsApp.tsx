import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function LandingWhatsApp() {
  useEffect(() => {
    document.title = "Enviar Factura por WhatsApp Automáticamente | TraceLess";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Emití factura y enviala por WhatsApp a tu cliente en 1 clic con link de pago. CAE real de ARCA, PDF con QR, recordatorios automáticos. Gratis 20 facturas/mes.");
  }, []);

  const faqs = [
    { q: "¿Cómo funciona el envío por WhatsApp?", a: "Emitís la factura y se envía automáticamente por WhatsApp Cloud API a tu cliente con el PDF y link de pago. Sin copiar, sin adjuntar, sin abrir WhatsApp." },
    { q: "¿El cliente recibe la factura en formato PDF?", a: "Sí. Recibe un mensaje con link a la factura en formato profesional con QR verificable en ARCA y datos del vendedor." },
    { q: "¿Puedo mandar la factura con link de pago?", a: "Sí. Si tenés MercadoPago Link, la factura incluye el link para que tu cliente pague online. Para cobro presencial mostrás el QR de la factura." },
    { q: "¿Cuántos mensajes de WhatsApp puedo mandar?", a: "Depende de tu plan. Gratis: 5/mes (wa.me). Pro: 80/mes (Cloud API). Equipo: 250/mes (Cloud API). Los mensajes van en la conversación, no en lista." },
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
            💬 Envío automático por WhatsApp
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-4">
            Enviá facturas por
            <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent"> WhatsApp.</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400 leading-relaxed mb-6 max-w-xl mx-auto">
            Emití la factura y <strong className="text-gray-200">se envía sola por WhatsApp</strong> a tu cliente con link de pago. CAE real de ARCA, PDF con QR, sin tocar el celu. <strong className="text-gray-200">20 gratis por mes.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 text-sm">
              Empezar Gratis — Sin tarjeta
            </Link>
          </div>
          <p className="text-[10px] text-gray-600 mt-3">Enviás 1 factura y tu cliente la recibe al instante en su WhatsApp.</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">WhatsApp + Facturación</h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto text-sm">Cobrás más rápido porque tu cliente la recibe al toque y paga con un toque.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "📨", title: "Envío automático", desc: "Emitís y se envía solo. Sin abrir WhatsApp, sin adjuntar, sin copiar números." },
              { icon: "💳", title: "Link de pago incluido", desc: "Con MercadoPago, tu cliente paga online con un toque. Tarjeta, QR o efectivo." },
              { icon: "⏰", title: "Recordatorio si no pagan", desc: "Si no te pagan en 7 días, le mandás recordatorio automático con 1 clic." },
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Preguntas sobre envío por WhatsApp</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Probalo ahora</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">20 facturas gratis. Mandale una factura a tu cliente en 2 minutos.</p>
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
