"use client"

import { useState, type FormEvent } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import type { Breach } from "@/data/breaches"

interface EmpresaResult {
  domain: string
  employees: number
  breaches: Breach[]
  totalBreaches: number
  riskScore: number
}

export default function EmpresaPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [domain, setDomain] = useState("")
  const [result, setResult] = useState<EmpresaResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!domain.includes(".")) return

    if (!user) {
      router.push("/sign-in")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/empresa?domain=${encodeURIComponent(domain)}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error)
        return
      }
      const data = await res.json()
      setResult(data)
    } catch {
      setError("Error al escanear el dominio")
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-600"
    if (score < 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getRiskBg = (score: number) => {
    if (score < 30) return "bg-green-100 dark:bg-green-900/30"
    if (score < 60) return "bg-yellow-100 dark:bg-yellow-900/30"
    return "bg-red-100 dark:bg-red-900/30"
  }

  const getRiskLabel = (score: number) => {
    if (score < 30) return "Bajo"
    if (score < 60) return "Medio"
    return "Alto"
  }

  return (
    <main className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-12">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">
          /empresa
        </p>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Escaneo para empresas</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Descubrí qué filtraciones afectan a los emails de tu dominio y gestioná las bajas de todo tu equipo.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="tuempresa.com.ar"
            className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg text-base focus:outline-none focus:border-amber-500 transition-colors"
            required
          />
          <button
            type="submit"
            disabled={loading || !domain.includes(".")}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "Escaneando..." : "Escanear dominio"}
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Filtraciones encontradas</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{result.totalBreaches}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Empleados estimados</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{result.employees}</p>
              </div>
              <div className={`${getRiskBg(result.riskScore)} border border-zinc-200 dark:border-zinc-700 rounded-xl p-5`}>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Riesgo del dominio</p>
                <p className={`text-3xl font-bold ${getRiskColor(result.riskScore)}`}>
                  {getRiskLabel(result.riskScore)}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-5 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded">Demo</span>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Escaneo simulado
                </h3>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Este es un escaneo simulado con datos de ejemplo. En la versión completa, TraceLess escanea cada email del dominio contra filtraciones reales y genera un reporte consolidado con cartas de baja para todo el equipo. Contactanos para acceder.
              </p>
            </div>

            {result.breaches.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                  Filtraciones que afectan a este dominio
                </h2>
                <div className="space-y-3">
                  {result.breaches.map((breach) => (
                    <div
                      key={breach.id}
                      className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 bg-white dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{breach.name}</h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{breach.domain}</p>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          {breach.date}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{breach.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
