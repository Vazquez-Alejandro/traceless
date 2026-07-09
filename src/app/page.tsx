"use client"

import { useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

const COMPLIANCE_CHECKLIST = [
  { id: 1, question: "¿Tu empresa tiene una política de privacidad publicada?", category: "documentacion" },
  { id: 2, question: "¿Capturás consentimiento explícito antes de recopilar datos?", category: "consentimiento" },
  { id: 3, question: "¿Tenés un registro de todas las actividades de tratamiento?", category: "documentacion" },
  { id: 4, question: "¿Notificás a los titulares en caso de brecha de seguridad?", category: "seguridad" },
  { id: 5, question: "¿Tenés designado un responsable de protección de datos?", category: "organizacion" },
  { id: 6, question: "¿Realizás evaluaciones de impacto para tratamientos de alto riesgo?", category: "seguridad" },
  { id: 7, question: "¿Los datos se almacenan solo el tiempo necesario?", category: "minimizacion" },
  { id: 8, question: "¿Tenés procedimientos para responder solicitudes de titulares?", category: "derechos" },
  { id: 9, question: "¿Los terceros que tratan datos tienen contratos de confidencialidad?", category: "terceros" },
  { id: 10, question: "¿Capacitás a tu personal en protección de datos?", category: "organizacion" },
  { id: 11, question: "¿Tenés un protocolo de respuesta ante incidentes?", category: "seguridad" },
  { id: 12, question: "¿Los datos sensibles tienen protección reforzada?", category: "seguridad" },
  { id: 13, question: "¿Podés eliminar datos de un titular bajo solicitud?", category: "derechos" },
  { id: 14, question: "¿Transferís datos al exterior? Si es así, ¿con garantías?", category: "internacional" },
  { id: 15, question: "¿Tenés documentada la base legal para cada tratamiento?", category: "documentacion" },
]

const FEATURES = [
  {
    icon: "✓",
    title: "Checklist de Cumplimiento",
    description: "Evaluá el estado de cumplimiento de tu empresa con la Ley 25.326 en 5 minutos.",
  },
  {
    icon: "📄",
    title: "Política de Privacidad",
    description: "Generá automáticamente una política de privacidad válida bajo la ley argentina.",
  },
  {
    icon: "📋",
    title: "Registro de Actividades",
    description: "Documentá qué datos tratás, con qué fines y cuál es la base legal.",
  },
  {
    icon: "✅",
    title: "Gestión de Consentimientos",
    description: "Registrá quién aceptó qué, cuándo y con qué alcance.",
  },
  {
    icon: "📊",
    title: "Reporte para Auditoría",
    description: "Descargá un PDF con el estado completo de cumplimiento de tu empresa.",
  },
  {
    icon: "🔔",
    title: "Alertas de Breach",
    description: "Monitoreá filtraciones de datos y recibí notificaciones instantáneas.",
  },
]

const PRICING = [
  {
    name: "Starter",
    price: "$49",
    period: "/mes",
    description: "Para empresas que recién empiezan",
    features: [
      "1 empresa",
      "Checklist de cumplimiento",
      "Política de privacidad",
      "1 usuario",
      "Soporte por email",
    ],
    cta: "Empezar gratis",
    popular: false,
  },
  {
    name: "Pro",
    price: "$149",
    period: "/mes",
    description: "Para empresas en crecimiento",
    features: [
      "5 empresas",
      "Todo de Starter",
      "Registro de actividades",
      "Gestión de consentimientos",
      "Reportes descargables",
      "3 usuarios",
      "Soporte prioritario",
    ],
    cta: "Empezar gratis",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$399",
    period: "/mes",
    description: "Para grandes organizaciones",
    features: [
      "Empresas ilimitadas",
      "Todo de Pro",
      "API de integración",
      "Monitoreo de breach",
      "Auditorías personalizadas",
      "Usuarios ilimitados",
      "Soporte dedicado",
      "SLA garantizado",
    ],
    cta: "Contactar ventas",
    popular: false,
  },
]

const STATS = [
  { value: "2,847", label: "Empresas cumplieron" },
  { value: "15,000+", label: "Empleados capacitados" },
  { value: "99.2%", label: "Tasa de cumplimiento" },
  { value: "48hs", label: "Tiempo promedio de setup" },
]

export default function HomePage() {
  const { user } = useUser()
  const router = useRouter()
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Cumplí la Ley 25.326 en minutos
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
              Protección de datos
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                sin complicaciones
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10">
              Herramienta simple para que tu empresa cumpla con la normativa de protección de datos personales.
              Checklist, políticas y reportes en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-lg"
                >
                  Ir al Dashboard
                </button>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-lg"
                  >
                    Empezar gratis
                  </Link>
                  <Link
                    href="#pricing"
                    className="px-8 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-semibold rounded-xl transition-colors text-lg"
                  >
                    Ver precios
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              Todo lo que necesitás para cumplir
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Herramientas diseñadas específicamente para la normativa argentina.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors bg-white dark:bg-zinc-900"
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              Cómo funciona
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              3 pasos para estar compliant
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Respondé el checklist",
                description: "15 preguntas simples sobre las prácticas de tu empresa.",
              },
              {
                step: "2",
                title: "Obtené tu reporte",
                description: "Dashboard con score de cumplimiento y acciones recomendadas.",
              },
              {
                step: "3",
                title: "Implementá las mejoras",
                description: "Seguí las recomendaciones y generá la documentación necesaria.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              Precios simples
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Sin costos ocultos. Cancelá cuando quieras.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING.map((plan, i) => (
              <div
                key={i}
                className={`p-8 rounded-2xl border ${
                  plan.popular
                    ? "border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10"
                    : "border-zinc-200 dark:border-zinc-800"
                } bg-white dark:bg-zinc-900 relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                    Más popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-white">{plan.price}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "/sign-up"}
                  className={`block w-full py-3 px-4 rounded-xl font-semibold text-center transition-colors ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-emerald-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            ¿Listo para cumplir con la ley?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Unite a las 2,847 empresas que ya protegen los datos de sus clientes.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-lg"
          >
            Empezar gratis ahora
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">Traceless</span>
            </div>
            <div className="flex gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/terminos" className="hover:text-zinc-900 dark:hover:text-white">Términos</Link>
              <Link href="/privacidad" className="hover:text-zinc-900 dark:hover:text-white">Privacidad</Link>
              <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-white">Contacto</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
