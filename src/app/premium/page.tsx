"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function PremiumPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (plan: "basico" | "pro") => {
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

  if (!isLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Protegé tu identidad digital
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
          Elegí el plan que mejor se adapte a tus necesidades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 bg-white dark:bg-zinc-900 flex flex-col">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Free</h2>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">$0</p>
          <ul className="space-y-3 mb-8 flex-1">
            <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500 mt-0.5">✓</span> Escaneo de brokers
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500 mt-0.5">✓</span> 2 búsquedas por mes
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Cartas Habeas Data
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Eliminación de datos
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Monitoreo mensual
            </li>
          </ul>
          <div className="text-center text-sm text-zinc-400 py-3">Plan actual</div>
        </div>

        {/* Básico */}
        <div className="border-2 border-amber-500 rounded-2xl p-8 bg-amber-50 dark:bg-amber-900/10 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Recomendado
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Básico</h2>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$5</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">USD por mes</p>
          <ul className="space-y-3 mb-8 flex-1">
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Escaneo ilimitado
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Cartas Habeas Data ilimitadas
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Eliminación de 3 brokers
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Monitoreo mensual
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Eliminación de todos los brokers
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe("basico")}
            disabled={loading === "basico"}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-xl transition-colors"
          >
            {loading === "basico" ? "Procesando..." : "Suscribirse"}
          </button>
        </div>

        {/* Pro */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 bg-white dark:bg-zinc-900 flex flex-col">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Pro <span className="text-xs font-normal text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full ml-2">Máxima protección</span>
          </h2>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$12</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">USD por mes</p>
          <ul className="space-y-3 mb-8 flex-1">
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Todo del plan Básico
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Eliminación de TODOS los brokers
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Monitoreo continuo
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Alertas por email
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Soporte prioritario
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe("pro")}
            disabled={loading === "pro"}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors"
          >
            {loading === "pro" ? "Procesando..." : "Suscribirse"}
          </button>
          <p className="text-xs text-zinc-400 text-center mt-2">$120/año (ahorrá 2 meses)</p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Cancelá cuando quieras. Sin compromiso. Todos los precios en USD.
        </p>
      </div>

      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center mb-8">
          Preguntas frecuentes
        </h2>
        <div className="space-y-6">
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">¿Cómo funciona la eliminación?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Generamos cartas legales bajo la Ley 25.326 (Habeas Data) que solicitás a cada broker.
              Con el plan Básico te ayudamos con los 3 brokers principales, y con Pro cubrimos todos.
            </p>
          </div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">¿Mis datos desaparecen para siempre?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Los brokers pueden volver a recopilar datos públicos. Por eso incluimos monitoreo mensual
              para detectar si tus datos reaparecen y generar nuevas solicitudes de eliminación.
            </p>
          </div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">¿Es legal esto?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sí. La Ley 25.326 de Protección de Datos Personales garantiza tu derecho de supresión.
              Los brokers están obligados a eliminar tus datos cuando lo solicitás formalmente.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
