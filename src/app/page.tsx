"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import SearchForm from "@/components/SearchForm"
import ResultsDashboard from "@/components/ResultsDashboard"
import type { SearchResult } from "@/data/breaches"
import { KNOWN_BREACHES } from "@/data/breaches"
import type { BrokerSearchResult } from "@/data/brokers"
import { ARGENTINE_BROKERS } from "@/data/brokers"

interface PlanInfo {
  plan: "free" | "basico" | "pro" | "familia" | "corporativo"
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
  const [query, setQuery] = useState<string | null>(null)
  const [breachResult, setBreachResult] = useState<SearchResult | null>(null)
  const [brokerResults, setBrokerResults] = useState<BrokerSearchResult[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<"email" | "dni">("email")
  const [scanningCount, setScanningCount] = useState(12847)

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

  useEffect(() => {
    const interval = setInterval(() => {
      setScanningCount(prev => prev + Math.floor(Math.random() * 3))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async (searchQuery: string) => {
    if (!user) {
      router.push("/sign-in")
      return
    }

    setIsLoading(true)
    setLimitError(null)

    const isEmail = searchQuery.includes("@")
    setSearchType(isEmail ? "email" : "dni")

    try {
      if (isEmail) {
        const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`)
        if (res.status === 403) {
          const data = await res.json()
          setLimitError(data.error)
          return
        }
        const data = await res.json()
        setBreachResult(data)
      } else {
        const res = await fetch(`/api/broker-search?query=${encodeURIComponent(searchQuery)}`)
        if (res.status === 403) {
          const data = await res.json()
          setLimitError(data.error)
          return
        }
        const data = await res.json()
        setBrokerResults(data.results)
      }

      setQuery(searchQuery)
      const planRes = await fetch("/api/check-plan")
      setPlan(await planRes.json())
    } catch {
      console.error("Error al buscar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setQuery(null)
    setBreachResult(null)
    setBrokerResults(null)
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
          {/* Urgency banner */}
          <div className="bg-red-600 text-white text-center py-2 px-4 rounded-full text-sm font-medium mb-8 mt-4">
            12,847+ argentinos ya protegen sus datos · Escaneo gratuito
          </div>

          <div className="py-12 md:py-20 animate-fade-in-up text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-100 leading-[1.1] mb-4 tracking-tight">
              Tus datos se están<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-slate-400 dark:from-amber-400 dark:to-slate-300">
                vendiendo
              </span>
            </h1>

            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
              Tu DNI, domicilio y teléfono aparecen en bases de datos argentinas como Dateas y Datacels.
              <strong className="text-zinc-700 dark:text-zinc-300"> Te ayudamos a eliminarlos.</strong>
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <button
                onClick={() => router.push("/sign-up")}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-amber-600/20 text-lg"
              >
                Escanear gratis
              </button>
              <button
                onClick={() => router.push("/premium")}
                className="px-8 py-4 border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-lg"
              >
                Ver planes
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-6 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["AV", "MR", "CL", "JP", "LS"].map((initials, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {initials}
                    </div>
                  ))}
                </div>
                <span>+500 usuarios</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span>4.9/5</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden mb-16">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                title: "Escaneo de brokers",
                desc: "Revisamos Dateas, Datacels y más para ver dónde aparecen tus datos.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Cartas Habeas Data",
                desc: "Generamos cartas legales bajo la Ley 25.326 para eliminar tus datos.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
                title: "Monitoreo continuo",
                desc: "Verificamos mensualmente si tus datos siguen apareciendo.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: "100% seguro",
                desc: "No accedemos a tus cuentas. Solo consultamos bases de datos públicas.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-zinc-900 p-7"
              >
                <div className="text-amber-500 dark:text-amber-400 mb-3">{f.icon}</div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center mb-8">
              ¿Cómo funciona?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Ingresá tu DNI", desc: "Escaneamos bases de datos argentinas en segundos." },
                { step: "2", title: "Vos ves dónde aparecés", desc: "Te mostramos en qué brokers tienen tus datos." },
                { step: "3", title: "Solicitás eliminación", desc: "Generamos cartas legales y vos las enviás." },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{s.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Brokers */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center mb-8">
              Bases de datos que escaneamos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ARGENTINE_BROKERS.map((broker) => (
                <div
                  key={broker.id}
                  className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center bg-white dark:bg-zinc-900"
                >
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{broker.name}</p>
                  <p className="text-xs text-zinc-400 mt-1">{broker.country}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial placeholder */}
          <div className="mb-16 p-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 text-center">
            <p className="text-zinc-600 dark:text-zinc-300 italic mb-4 max-w-lg mx-auto">
              "Encontré mis datos en Dateas sin saberlo. Con TraceLess pude solicitar la eliminación y ahora duermo tranquilo sabiendo que mi familia está protegida."
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">María G., Buenos Aires</p>
            <p className="text-xs text-zinc-400">Cliente desde 2026</p>
          </div>
        </div>
      </main>
    )
  }

  if (breachResult && query && searchType === "email") {
    return (
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-12">
        <ResultsDashboard
          result={breachResult}
          email={query}
          onReset={handleReset}
          plan={plan ?? undefined}
        />
      </main>
    )
  }

  if (brokerResults && query && searchType === "dni") {
    const foundCount = brokerResults.filter(r => r.found).length
    const totalCount = brokerResults.length

    return (
      <main className="flex-1 px-4">
        <div className="max-w-4xl mx-auto py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Resultados para</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{query}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
            >
              ← Nueva búsqueda
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Bases de datos con tus datos</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{foundCount}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Bases de datos escaneadas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalCount}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Nivel de riesgo</p>
              <p className={`text-3xl font-bold ${foundCount >= 3 ? "text-red-600 dark:text-red-400" : foundCount >= 2 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                {foundCount >= 3 ? "Alto" : foundCount >= 2 ? "Medio" : foundCount >= 1 ? "Bajo" : "Seguro"}
              </p>
            </div>
          </div>

          {foundCount > 0 && (
            <div className="mb-8 p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                Tus datos aparecen en {foundCount} base{foundCount !== 1 ? "s" : ""} de datos
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                Tu información personal está siendo vendida por estos sitios. Podés solicitar su eliminación bajo la Ley 25.326.
              </p>
              <button
                onClick={() => router.push("/premium")}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Solicitar eliminación
              </button>
            </div>
          )}

          <div className="space-y-4">
            {brokerResults.map((result) => (
              <div
                key={result.broker.id}
                className={`border rounded-xl p-5 ${
                  result.found
                    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      result.found
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    }`}>
                      {result.found ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{result.broker.name}</p>
                      <p className="text-xs text-zinc-400">{result.broker.domain}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    result.found
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  }`}>
                    {result.found ? "Encontrado" : "No encontrado"}
                  </span>
                </div>

                {result.found && result.dataFound.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Datos encontrados:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.dataFound.map((dataType) => (
                        <span
                          key={dataType}
                          className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded"
                        >
                          {dataType}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                      Tiempo estimado de eliminación: {result.broker.estimatedTime}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {plan?.plan === "free" && (
            <div className="mt-8 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Plan Básico — eliminá tus datos
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                Por $5 USD/mes te ayudamos a eliminar tus datos de las bases de datos principales.
                Incluye cartas Habeas Data y seguimiento mensual.
              </p>
              <button
                onClick={() => router.push("/premium")}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Ver planes
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  const breachesCount = KNOWN_BREACHES.length

  return (
    <main className="flex-1 px-4 relative">
      <div className="max-w-3xl mx-auto">
        <div className="pt-12 pb-8 animate-fade-in-up">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">
            /dashboard /{ARGENTINE_BROKERS.length} brokers
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-2">
            ¿Quién está vendiendo tus datos?
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Ingresá tu DNI o email y escaneamos bases de datos argentinas.
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
              Plan Básico sin límites →
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
              Escaneando bases de datos argentinas...
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
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ),
              title: "Escaneo de brokers",
              desc: "Revisamos las principales bases de datos argentinas para ver dónde aparecen tus datos.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: "Cartas Habeas Data",
              desc: "Generamos cartas legales bajo la Ley 25.326 para solicitar la eliminación de tus datos.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ),
              title: "Monitoreo continuo",
              desc: "Verificamos mensualmente si tus datos siguen apareciendo y te alertamos.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              title: "Sin acceder a tus datos",
              desc: "No accedemos a tu correo ni cuentas. Solo consultamos bases de datos públicas.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white dark:bg-zinc-900 p-6">
              <div className="text-amber-500 dark:text-amber-400 mb-3">{f.icon}</div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mt-2 mb-1 text-sm">{f.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
