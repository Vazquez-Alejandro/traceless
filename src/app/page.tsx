"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import SearchForm from "@/components/SearchForm"
import ResultsDashboard from "@/components/ResultsDashboard"
import type { SearchResult } from "@/data/breaches"
import { KNOWN_BREACHES } from "@/data/breaches"

interface PlanInfo {
  plan: "free" | "premium"
  searchesUsed: number
  searchesLimit: number | "∞"
  lettersUsed: number
  lettersLimit: number | "∞"
  batchDeletion: boolean
  monitoring: boolean
}

export default function HomePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetch("/api/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || user.firstName || "",
        }),
      }).then(() => {
        fetch("/api/check-plan")
          .then((res) => res.json())
          .then(setPlan)
          .catch(() => {})
      })
    }
  }, [user])

  const handleSearch = async (query: string) => {
    if (!user) {
      router.push("/sign-in")
      return
    }

    setIsLoading(true)
    setLimitError(null)
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`)
      if (res.status === 403) {
        const data = await res.json()
        setLimitError(data.error)
        return
      }
      const data = await res.json()
      setResult(data)
      setEmail(query)
      const planRes = await fetch("/api/check-plan")
      setPlan(await planRes.json())
    } catch {
      console.error("Error al buscar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setEmail(null)
    setResult(null)
    setLimitError(null)
  }

  if (!isLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex-1 px-4 relative">
        <div className="max-w-3xl mx-auto">
          <div className="py-16 md:py-24 animate-fade-in-up text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-100 leading-[1.1] mb-4 tracking-tight">
              ¿Dónde está expuesto<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-slate-400 dark:from-amber-400 dark:to-slate-300">
                tu email?
              </span>
            </h1>

            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto mb-10 leading-relaxed">
              Descubrí en qué filtraciones de datos apareció tu correo y generá cartas de baja para eliminar tu información personal.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <button
                onClick={() => router.push("/sign-up")}
                className="px-7 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-amber-600/20"
              >
                Crear cuenta gratis
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden mb-20">
            {[
              {
                number: "01",
                title: "Escaneo instantáneo",
                desc: "Buscamos tu email en más de 30 filtraciones de datos públicas conocidas al instante.",
              },
              {
                number: "02",
                title: "Cartas de baja",
                desc: "Generamos cartas legales con fundamento RGPD/LOPDGDD para solicitar la eliminación de tus datos.",
              },
              {
                number: "03",
                title: "Seguimiento de cartas",
                desc: "Si tus datos siguen apareciendo después de enviar la carta, te avisamos para que reenvíes la solicitud.",
              },
              {
                number: "04",
                title: "Sin acceso a tu mail",
                desc: "No leemos tu bandeja de entrada. Solo consultamos bases de datos públicas de filtraciones conocidas.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-zinc-900 p-7"
              >
                <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-semibold">{f.number}</span>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mt-2 mb-1.5">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (result && email) {
    return (
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-12">
        <ResultsDashboard
          result={result}
          email={email}
          onReset={handleReset}
          plan={plan ?? undefined}
        />
      </main>
    )
  }

  const breachesCount = KNOWN_BREACHES.length

  return (
    <main className="flex-1 px-4 relative">
      <div className="max-w-3xl mx-auto">
        <div className="pt-12 pb-8 animate-fade-in-up">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">
            /dashboard /{breachesCount} breaches
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-2">
            ¿Dónde está expuesto tu email?
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Ingresá tu correo y escaneamos en busca de filtraciones.
          </p>
        </div>

        {plan && plan.plan === "free" && (
          <div className="mb-6 flex items-center justify-between px-5 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-sm animate-fade-in-up">
            <span className="text-amber-700 dark:text-amber-300">
              <span className="font-medium">{plan.searchesUsed}/{plan.searchesLimit}</span> búsquedas usadas este mes
            </span>
            <button
              onClick={() => router.push("/premium")}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Premium sin límites →
            </button>
          </div>
        )}

        {limitError && (
          <div className="mb-6 px-5 py-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg animate-fade-in-up">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">{limitError}</p>
            <button
              onClick={() => router.push("/premium")}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Ver planes
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 animate-fade-in-up">
            <div className="relative mx-auto mb-6 w-12 h-12">
              <div className="absolute inset-0 rounded-full border-[3px] border-zinc-200 dark:border-zinc-700" />
              <div className="absolute inset-0 rounded-full border-[3px] border-amber-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Escaneando bases de datos de filtraciones conocidas...
            </p>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden mb-12">
          {[
            {
              number: "01",
              title: "Escaneo instantáneo",
              desc: "Buscamos tu email en más de 30 filtraciones de datos públicas conocidas al instante.",
            },
            {
              number: "02",
              title: "Cartas de baja",
              desc: "Generamos cartas legales con fundamento RGPD/LOPDGDD para solicitar la eliminación de tus datos.",
            },
            {
              number: "03",
              title: "Seguimiento de cartas",
              desc: "Si tus datos siguen apareciendo después de enviar la carta, te avisamos para que reenvíes la solicitud.",
            },
            {
              number: "04",
              title: "Sin acceso a tu mail",
              desc: "No leemos tu bandeja de entrada. Solo consultamos bases de datos públicas de filtraciones conocidas.",
            },
          ].map((f, i) => (
            <div key={f.title} className="bg-white dark:bg-zinc-900 p-6">
              <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-semibold">{f.number}</span>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mt-2 mb-1 text-sm">{f.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
