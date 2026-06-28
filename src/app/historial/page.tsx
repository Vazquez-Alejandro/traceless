"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import type { Breach } from "@/data/breaches"

interface HistoryLetter {
  id: string
  breach_id: string
  email: string
  created_at: string
}

interface HistoryBreach extends Breach {
  hasLetter: boolean
}

interface HistoryEntry {
  id: string
  email: string
  created_at: string
  totalBreaches: number
  riskScore: number
  breaches: HistoryBreach[]
  lettersCount: number
  letters: HistoryLetter[]
}

export default function HistorialPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [letterLoading, setLetterLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      router.push("/sign-in")
      return
    }

    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        setHistory(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [user, isLoaded, router])

  const handleGenerateLetter = async (breachId: string, email: string) => {
    setLetterLoading(breachId)
    try {
      await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breachId, email }),
      })
      const res = await fetch("/api/history")
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch {
      console.error("Error generando carta")
    } finally {
      setLetterLoading(null)
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  const totalSearches = history.length
  const totalLetters = history.reduce((s, h) => s + h.lettersCount, 0)
  const totalBreachesFound = history.reduce((s, h) => s + h.totalBreaches, 0)

  return (
    <main className="flex-1 px-4">
      <div className="max-w-4xl mx-auto py-12">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/historial</p>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Historial de búsquedas</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          {totalSearches} búsquedas · {totalBreachesFound} filtraciones encontradas · {totalLetters} cartas generadas
        </p>

        {history.length === 0 ? (
          <div className="text-center py-16 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">Todavía no hiciste ninguna búsqueda.</p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg"
            >
              Buscar mi email
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${entry.riskScore > 50 ? "bg-red-500" : entry.riskScore > 20 ? "bg-amber-500" : "bg-green-500"}`} />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{entry.email}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(entry.created_at).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-500">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.totalBreaches}</span> filtraciones
                    </span>
                    <span className="text-zinc-500">
                      <span className="font-medium text-amber-600">{entry.lettersCount}</span> cartas
                    </span>
                    <svg className={`w-4 h-4 text-zinc-400 transition-transform ${expandedId === entry.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedId === entry.id && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-4">
                    {entry.breaches.length === 0 ? (
                      <p className="text-sm text-zinc-500">No se encontraron filtraciones para este email.</p>
                    ) : (
                      <div className="space-y-2">
                        {entry.breaches.map((breach) => (
                          <div
                            key={breach.id}
                            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${breach.hasLetter ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {breach.name}
                                </p>
                                <p className="text-xs text-zinc-400 truncate">{breach.domain}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                              {breach.hasLetter ? (
                                <span className="text-xs text-green-600 font-medium">Carta generada</span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleGenerateLetter(breach.id, entry.email)
                                  }}
                                  disabled={letterLoading === breach.id}
                                  className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors"
                                >
                                  {letterLoading === breach.id ? "..." : "Generar carta"}
                                </button>
                              )}
                              {breach.deletionUrl && (
                                <a
                                  href={breach.deletionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                  Web
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
