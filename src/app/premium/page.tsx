"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function PremiumPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (plan: "premium" | "pro") => {
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
          Protegé tu privacidad al máximo
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
              <span className="text-green-500 mt-0.5">✓</span> 3 búsquedas por mes
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500 mt-0.5">✓</span> 2 cartas de baja por mes
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Apertura masiva
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Monitoreo semanal
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Dashboard multi-cliente
            </li>
          </ul>
          <div className="text-center text-sm text-zinc-400 py-3">Plan actual</div>
        </div>

        {/* Premium */}
        <div className="border-2 border-amber-500 rounded-2xl p-8 bg-amber-50 dark:bg-amber-900/10 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Recomendado
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Premium</h2>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$5</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">por mes</p>
          <ul className="space-y-3 mb-8 flex-1">
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Búsquedas ilimitadas
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Cartas de baja ilimitadas
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Apertura masiva de páginas de baja
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Monitoreo semanal automático
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">✗</span> Dashboard multi-cliente
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe("premium")}
            disabled={loading === "premium"}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-xl transition-colors"
          >
            {loading === "premium" ? "Procesando..." : "Suscribirse"}
          </button>
        </div>

        {/* Pro */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 bg-white dark:bg-zinc-900 flex flex-col">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Pro <span className="text-xs font-normal text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full ml-2">Para estudios</span>
          </h2>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">$25</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">por mes</p>
          <ul className="space-y-3 mb-8 flex-1">
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Búsquedas ilimitadas
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Cartas de baja ilimitadas
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Apertura masiva
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Monitoreo semanal
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> <strong>Dashboard multi-cliente</strong>
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Carga masiva de emails
            </li>
            <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-green-500 mt-0.5">✓</span> Reportes agrupados por cliente
            </li>
          </ul>
          <button
            onClick={() => handleSubscribe("pro")}
            disabled={loading === "pro"}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors"
          >
            {loading === "pro" ? "Procesando..." : "Suscribirse"}
          </button>
          <p className="text-xs text-zinc-400 text-center mt-2">$250/año (ahorrá 2 meses)</p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Cancelá cuando quieras. Sin compromiso. Todos los precios en USD.
        </p>
      </div>
    </main>
  )
}
