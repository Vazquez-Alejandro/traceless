"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function PremiumPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState("")
  const [referralApplied, setReferralApplied] = useState(false)

  const handleSubscribe = async (plan: "basico" | "pro" | "familia" | "corporativo") => {
    if (!user) {
      router.push(`/sign-in?redirect=/premium`)
      return
    }

    setLoading(plan)
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      console.error("Error al crear checkout")
    } finally {
      setLoading(null)
    }
  }

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return
    try {
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode }),
      })
      if (res.ok) {
        setReferralApplied(true)
      }
    } catch {}
  }

  if (!isLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Protegé tu identidad digital
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
          Elegí el plan que mejor se adapte a tus necesidades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Free */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 bg-white dark:bg-zinc-900 flex flex-col">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Free</h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">$0</p>
          <ul className="space-y-2 mb-6 flex-1 text-sm">
            <li className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500 mt-0.5">✓</span> Escaneo de brokers
            </li>
            <li className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500 mt-0.5">✓</span> 2 búsquedas/mes
            </li>
            <li className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Cartas Habeas Data
            </li>
            <li className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Eliminación
            </li>
            <li className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Monitoreo
            </li>
          </ul>
          <div className="text-center text-sm text-zinc-400 py-2">Plan actual</div>
        </div>

        {/* Básico */}
        <div className="border-2 border-amber-500 rounded-2xl p-6 bg-amber-50 dark:bg-amber-900/10 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Más popular
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Básico</h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$5</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">USD/mes</p>
          <ul className="space-y-2 mb-6 flex-1 text-sm">
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Escaneo ilimitado
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Cartas ilimitadas
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> 3 brokers eliminación
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Monitoreo mensual
            </li>
            <li className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Dark web
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe("basico")}
            disabled={loading === "basico"}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading === "basico" ? "Procesando..." : "Suscribirse"}
          </button>
        </div>

        {/* Pro */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 bg-white dark:bg-zinc-900 flex flex-col">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Pro
          </h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$12</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">USD/mes</p>
          <ul className="space-y-2 mb-6 flex-1 text-sm">
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Todo del Básico
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> TODOS los brokers
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Monitoreo dark web
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Alertas por email
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Soporte prioritario
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe("pro")}
            disabled={loading === "pro"}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading === "pro" ? "Procesando..." : "Suscribirse"}
          </button>
        </div>

        {/* Familia */}
        <div className="border-2 border-emerald-500 rounded-2xl p-6 bg-emerald-50 dark:bg-emerald-900/10 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Ahorrá 60%
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Familia</h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$15</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">USD/mes · 5 miembros</p>
          <ul className="space-y-2 mb-6 flex-1 text-sm">
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Todo del Pro
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> 5 miembros de familia
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Alertas familiares
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Monitoreo menores
            </li>
            <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> $3 por miembro extra
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe("familia")}
            disabled={loading === "familia"}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading === "familia" ? "Procesando..." : "Suscribirse"}
          </button>
        </div>
      </div>

      {/* Corporativo */}
      <div className="mb-12 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Plan Corporativo
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-lg">
              Protegé a tu equipo. Dashboard multi-empleado, reportes de compliance, alertas de breach y soporte dedicado.
            </p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$75</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">USD/mes · hasta 25 empleados</p>
            <button
              onClick={() => handleSubscribe("corporativo")}
              disabled={loading === "corporativo"}
              className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-xl transition-colors text-sm"
            >
              {loading === "corporativo" ? "Procesando..." : "Contactar ventas"}
            </button>
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="mb-12 p-6 border border-amber-200 dark:border-amber-800 rounded-2xl bg-amber-50 dark:bg-amber-900/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Tenés un código de referido?
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ingresalo y obtené 1 mes gratis por cada 2 amigos que se suscriban.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="TL-XXXXXXXX"
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              onClick={handleApplyReferral}
              disabled={!referralCode.trim() || referralApplied}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors text-sm"
            >
              {referralApplied ? "Aplicado" : "Aplicar"}
            </button>
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div className="mb-12 text-center">
        <p className="text-sm text-zinc-400 mb-4">Más de 500 argentinos ya protegen sus datos con TraceLess</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { icon: "🔒", title: "Encriptación", desc: "Tus datos están protegidos" },
          { icon: "⚡", title: "Cancelá cuando quieras", desc: "Sin compromiso" },
          { icon: "🇦🇷", title: "Ley 25.326", desc: "Base legal argentina" },
          { icon: "💳", title: "Seguro Stripe", desc: "Pago 100% seguro" },
        ].map((t) => (
          <div key={t.title} className="text-center p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            <div className="text-2xl mb-2">{t.icon}</div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</p>
            <p className="text-xs text-zinc-400">{t.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center mb-8">
          Preguntas frecuentes
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "¿Cómo funciona la eliminación?",
              a: "Generamos cartas legales bajo la Ley 25.326 (Habeas Data) que solicitás a cada broker. Con el plan Básico te ayudamos con los 3 brokers principales, y con Pro/Familia cubrimos todos."
            },
            {
              q: "¿Mis datos desaparecen para siempre?",
              a: "Los brokers pueden volver a recopilar datos públicos. Por eso incluimos monitoreo mensual para detectar si tus datos reaparecen y generar nuevas solicitudes de eliminación."
            },
            {
              q: "¿Es legal esto?",
              a: "Sí. La Ley 25.326 de Protección de Datos Personales garantiza tu derecho de supresión. Los brokers están obligados a eliminar tus datos cuando lo solicitás formalmente."
            },
            {
              q: "¿Qué es el monitoreo dark web?",
              a: "Escaneamos foros y mercados ilegales para detectar si tus credenciales o datos personales fueron filtrados. Te avisamos por email si encontramos algo."
            },
            {
              q: "¿Cómo funciona el plan Familia?",
              a: "Cubre hasta 5 miembros de tu familia por $15 USD/mes. Cada miembro tiene su propia cuenta con escaneo, cartas y monitoreo incluidos."
            },
            {
              q: "¿Puedo cancelar en cualquier momento?",
              a: "Sí. No hay compromiso ni penalidades. Cancelás cuando quierás desde tu dashboard."
            },
            {
              q: "¿Cómo funciona el programa de referidos?",
              a: "Compartí tu código único. Por cada 2 amigos que se suscriban, obtenés 1 mes gratis."
            },
          ].map((faq) => (
            <div key={faq.q} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{faq.q}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Todos los precios en USD. Cancelá cuando quieras.
        </p>
      </div>
    </main>
  )
}
