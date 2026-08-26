import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPricing, formatUSD, formatARS } from "../pricing";
import Carousel from "../components/Carousel";

const SHOW_TESTIMONIALS = false; // Cambiar a true cuando tengamos testimonios reales

const TESTIMONIALS = [
  {
    name: "Gisela D.",
    role: "Monotributista",
    text: "Uso TraceLess para facturar a mis clientes. Lo mejor es que la factura llega por WhatsApp al instante y no tengo que perseguir a nadie para que pague.",
  },
  {
    name: "Leonardo M.",
    role: "Responsable Inscripto",
    text: "Pasé de ARCA a TraceLess en 5 minutos. Ahora facturo desde el celular y mis clientes reciben todo al toque. Me ahorra horas por mes.",
  },
  {
    name: "Martín S.",
    role: "Estudio contable",
    text: "Mis clientes que usan TraceLess me facilitan la vida. Las facturas llegan organizadas y no tengo que estar pidiendo comprobantes por WhatsApp.",
  },
];

const PLANS = [
  {
    key: "free",
    name: "Gratis",
    price: "Gratis",
    desc: "Para siempre. 20 facturas/mes.",
    features: ["20 facturas por mes", "Sin WhatsApp API", "1 usuario"],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Profesional",
    price: "price_pro",
    desc: "Para profesionales que facturan mucho.",
    features: ["Facturas ilimitadas", "100 msg WhatsApp incluidos", "$70/msg extra", "Analytics de pagos", "Facturas recurrentes"],
    highlighted: true,
  },
  {
    key: "team",
    name: "Equipo",
    price: "price_team",
    desc: "Para estudios, PyMEs y empresas.",
    features: ["Todo del plan Profesional", "250 msg WhatsApp incluidos", "$60/msg extra", "Cola de reintentos ARCA", "Soporte prioritario"],
    highlighted: false,
  },
];

interface Feature {
  icon: string;
  title: string;
  shortDesc: string;
  longDesc: string;
}

const FEATURES: Feature[] = [
  {
    icon: "🧾",
    title: "Facturas A, B, C y E",
    shortDesc: "Con validez ARCA. Números correlativos automáticos.",
    longDesc: "Emití facturas con CAE real ante ARCA (AFIP) en segundos. Tipos A, B, C y E según tu condición fiscal. <strong>También podés emitir comprobantes simples sin CAE</strong> para presupuestos, notas de venta o clientes que no requieren factura fiscal. Números correlativos automáticos por punto de venta. PDF profesional con QR de pago y branding."
  },
  {
    icon: "📱",
    title: "Envío por WhatsApp",
    shortDesc: "Llega al celular de tu cliente al instante. Sin adjuntar PDFs.",
    longDesc: "La factura llega directo al chat de WhatsApp de tu cliente con un link público. No necesita descargar nada, se ve perfecto en el celular. Dos modos: <strong>wa.me (gratis, sin configuración)</strong> abre WhatsApp con el mensaje listo para enviar, o <strong>Meta Cloud API</strong> para envío 100% automático desde la app. Incluye link de pago MP y QR transferencia."
  },
  {
    icon: "📊",
    title: "Dashboard inteligente",
    shortDesc: "Vé qué clientes pagan a tiempo y quiénes se atrasan siempre.",
    longDesc: "Vista ejecutiva de tu facturación: total del mes, comparación vs mes anterior, facturas por cobrar, pagadas y vencidas. <strong>Analytics de clientes</strong> (plan Pro+): ranking de mejores pagadores, frecuencia de pago, atraso promedio por cliente. Exportación a Excel para tu contador. Todo en una pantalla sin navegar."
  },
  {
    icon: "🔄",
    title: "Facturas recurrentes",
    shortDesc: "Se emiten solas cada mes. No te olvidés nunca más.",
    longDesc: "Configurá una vez: cliente, importe, descripción, día del mes. TraceLess la emite automáticamente con CAE real y la envía por WhatsApp/Email. <strong>Si ARCA no responde, entra en cola de reintentos</strong> con backoff exponencial y se emite apenas vuelve. Notificación por WhatsApp si falla 3 veces. Editable o cancelable en cualquier momento."
  },
  {
    icon: "⏰",
    title: "Recordatorios automáticos",
    shortDesc: "WhatsApp semanal a los clientes que deben. Sin hacer nada.",
    longDesc: "Cada lunes TraceLess envía recordatorios por WhatsApp a facturas impagas. A los 30 días el mensaje se intensifica y la factura pasa a estado <strong>vencida</strong>. Recordatorio de monotributo el día 20 de cada mes para planes pagos. <strong>El cliente puede responder 'ALTO' para desuscribirse</strong> y vos configurás qué recordatorios querés desde tu perfil."
  },
  {
    icon: "📎",
    title: "Links públicos",
    shortDesc: "Compartí la factura por cualquier medio. Sin registro del cliente.",
    longDesc: "Cada factura tiene su link propio que podés compartir con cualquiera. Quien lo abre ve la factura lista en su navegador, con QR de pago, link de MercadoPago y tus datos. <strong>No hace falta que el cliente tenga cuenta ni app</strong> — se lo mandás por WhatsApp, Email o el medio que prefieras. Se ve bonito al compartirlo en WhatsApp y el PDF se descarga con un click."
  },
];

interface FeatureCardProps {
  feature: Feature;
  expanded: boolean;
  onToggle: () => void;
}

function FeatureCard({ feature, expanded, onToggle }: FeatureCardProps) {
  return (
    <div className={`relative ${expanded ? 'z-30' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-full h-full p-6 bg-gray-900/40 border transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 flex flex-col ${
          expanded
            ? 'rounded-t-2xl border-blue-500/40 border-b-0'
            : 'rounded-2xl border-gray-800/40 hover:border-gray-700/60'
        }`}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl mb-3 flex-shrink-0">{feature.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-1.5">{feature.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{feature.shortDesc}</p>
          </div>
          <div className="flex-shrink-0 ml-2 mt-1">
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div
          className="absolute left-0 right-0 top-full p-6 rounded-b-2xl bg-[#0a101d] border border-t-0 border-blue-500/40 animate-slide-down"
        >
          <div className="text-xs text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: feature.longDesc }} />
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const [pricing, setPricing] = useState<{ pro?: { label: string; label_ars: string; ars: number }; team?: { label: string; label_ars: string; ars: number } }>({});
  const [openFeature, setOpenFeature] = useState<number | null>(null);
  useEffect(() => {
    getPricing().then((p) => {
      if (p && p.prices) {
        setPricing({ pro: p.prices.pro, team: p.prices.team });
      }
    });
  }, []);

  const priceText = (p: (typeof PLANS)[number]) => {
    if (p.key === "free") return "Gratis";
    const ref = p.price === "price_pro" ? pricing.pro : pricing.team;
    if (!ref) return p.price === "price_pro" ? "USD 12" : "USD 22";
    return `${ref.label}/mes`;
  };

  const priceSub = (p: (typeof PLANS)[number]) => {
    if (p.key === "free") return "";
    const ref = p.price === "price_pro" ? pricing.pro : pricing.team;
    if (!ref) return "";
    return `≈ ${formatARS(ref.ars)}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
          <span className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink">
            <img src="/logonegro.svg" alt="TraceLess" className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex-shrink-0" />
            <span className="font-bold text-base sm:text-lg truncate">TraceLess</span>
          </span>
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <Link to="/login" className="text-[11px] sm:text-xs text-gray-400 hover:text-white whitespace-nowrap ml-2 sm:ml-3">Iniciar Sesión</Link>
            <Link to="/register" className="inline-flex items-center justify-center text-center px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-semibold rounded-lg whitespace-nowrap leading-none">Empezar Gratis</Link>
          </div>
        </div>
      </nav>

      <section className="flex items-center justify-center px-4 pt-16 pb-12">
        <div className="text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-medium text-blue-400 mb-6">
            🇦🇷 Hecho para negocios argentinos
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
          <p className="text-[10px] text-gray-600 mt-3">Plan Gratis para siempre: 20 facturas/mes. Sin tarjeta de crédito.</p>
        </div>
      </section>

      <Carousel />

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
            No necesitás un sistema complicado. Es justo lo que necesitás para facturar, enviar y cobrar.
          </p>
          <div className="grid md:grid-cols-3 gap-6 items-stretch md:auto-rows-fr">
            {FEATURES.map((f, i) => (
              <FeatureCard
                key={i}
                feature={f}
                expanded={openFeature === i}
                onToggle={() => setOpenFeature(openFeature === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {SHOW_TESTIMONIALS && (
        <section className="py-12 sm:py-20">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Lo que dicen nuestros usuarios</h2>
            <p className="text-gray-400 text-center mb-8 max-w-lg mx-auto text-sm">
              Monotributistas y profesionales que ya facturan con TraceLess.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/40">
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="precios" className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Planes simples, sin sorpresas</h2>
          <p className="text-gray-400 text-center mb-8 max-w-lg mx-auto text-sm">
            Empezá en el plan Gratis para siempre. Subí a Pro cuando necesités WhatsApp automático o facturas ilimitadas.
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
                <div className="text-2xl font-bold mb-1">{priceText(p)}</div>
                {p.price !== "Gratis" && <div className="text-[10px] text-gray-500 mb-2">{priceSub(p)}</div>}
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
            Empezá con el plan Gratis para siempre. En 5 minutos tenés tu primera factura lista.
          </p>
          <Link to="/register" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 text-sm">
            Empezar Gratis — Sin tarjeta
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
            <span>soporte@traceless.com.ar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
