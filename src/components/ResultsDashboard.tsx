"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import type { SearchResult, Breach } from "@/data/breaches"
import BreachCard from "./BreachCard"
import LetterModal from "./LetterModal"
import BatchDeletionModal from "./BatchDeletionModal"
import PasswordScanner from "./PasswordScanner"
import SecurityChecklist from "./SecurityChecklist"
import ExposureSummary from "./ExposureSummary"
import ActionRecommendations from "./ActionRecommendations"
import { useToast } from "./Toast"
import { generateMasterDeletionLetter, PROFILE_KEY } from "@/lib/letters"
import type { UserProfile } from "@/lib/letters"

interface PlanInfo {
  plan: "free" | "basico" | "pro" | "familia" | "corporativo"
  searchesUsed: number
  searchesLimit: number | "∞"
  lettersUsed: number
  lettersLimit: number | "∞"
  batchDeletion: boolean
  monitoring: boolean
}

interface ResultsDashboardProps {
  result: SearchResult
  email: string
  onReset: () => void
  plan?: PlanInfo
}

const FREE_VISIBLE_BREACHES = 3

export default function ResultsDashboard({ result, email, onReset, plan }: ResultsDashboardProps) {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedBreach, setSelectedBreach] = useState<Breach | null>(null)
  const [showBatchModal, setShowBatchModal] = useState(false)

  const isFree = plan?.plan === "free"
  const visibleBreaches = isFree ? result.breaches.slice(0, FREE_VISIBLE_BREACHES) : result.breaches

  const toggleBreach = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === visibleBreaches.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleBreaches.map((b) => b.id)))
    }
  }

  const selectedBreaches = result.breaches.filter((b) => selectedIds.has(b.id))

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-600 dark:text-green-400"
    if (score < 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
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

  const handleMasterLetter = () => {
    if (!user) {
      router.push("/sign-in")
      return
    }
    if (plan?.plan === "free") {
      router.push("/premium")
      return
    }

    let profile: UserProfile | undefined
    try {
      const raw = localStorage.getItem(PROFILE_KEY)
      if (raw) profile = JSON.parse(raw)
    } catch {}

    const letter = generateMasterDeletionLetter(
      selectedBreaches.map((b) => `${b.name} (${b.domain})`),
      profile
    )

    navigator.clipboard.writeText(letter)
    toast("Carta maestra copiada al clipboard. Pegala en tu editor o email.")
  }

  const handleOpenBatchDeletion = () => {
    if (!user) {
      router.push("/sign-in")
      return
    }
    if (plan?.plan === "free") {
      router.push("/premium")
      return
    }
    setShowBatchModal(true)
  }

  const lettersLeft = plan && plan.lettersLimit !== "∞"
    ? plan.lettersLimit - plan.lettersUsed
    : null

  return (
    <>
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Resultados para</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{email}</p>
          </div>
          <div className="flex items-center gap-4">
            {plan && (
              <span className="text-xs text-zinc-400">
                {plan.plan !== "free" ? `⭐ ${plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)}` : `Free · ${plan.searchesUsed}/${plan.searchesLimit}`}
              </span>
            )}
            <button
              onClick={onReset}
              className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
            >
              ← Nueva búsqueda
            </button>
          </div>
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Filtraciones encontradas</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{result.totalBreaches}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Sitios seguros (estimado)</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{result.safeSites}</p>
            </div>
            <div className={`${getRiskBg(result.riskScore)} border border-zinc-200 dark:border-zinc-700 rounded-xl p-5`}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Nivel de exposición</p>
              <p className={`text-3xl font-bold ${getRiskColor(result.riskScore)}`}>
                {getRiskLabel(result.riskScore)}
              </p>
            </div>
          </div>

        {result.breaches.length > 0 && (
          <>
            <ExposureSummary breaches={result.breaches} />
            <ActionRecommendations breaches={result.breaches} email={email} />
          </>
        )}

        {result.breaches.length > 0 && (
          <div className="mb-6">
            {(() => {
              const totalWithLetters = result.breaches.filter((b) => b.hasLetter).length
              if (totalWithLetters === 0) return null
              return (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {totalWithLetters} de {result.totalBreaches} filtraci{result.totalBreaches === 1 ? "ón" : "ones"} con carta enviada
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-6">
                    {totalWithLetters === result.totalBreaches
                      ? "Ya enviaste carta a todos los sitios. Volvé a buscar el próximo mes para verificar si eliminaron tus datos."
                      : `Faltan ${result.totalBreaches - totalWithLetters} sitios por gestionar.`}
                  </p>
                </div>
              )
            })()}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Filtraciones detectadas
              </h2>
              {visibleBreaches.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                >
                  {selectedIds.size === visibleBreaches.length ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
              )}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Marcá los sitios de los que quieras eliminar tus datos.
              {isFree && result.totalBreaches > FREE_VISIBLE_BREACHES && (
                <span className="text-amber-600 font-medium">
                  {" "}Mostrando {FREE_VISIBLE_BREACHES} de {result.totalBreaches} filtraciones. {result.totalBreaches - FREE_VISIBLE_BREACHES} bloqueadas.
                </span>
              )}
              {!isFree && result.totalBreaches >= 15 && (
                <span className="text-red-500"> Riesgo alto de exposición.</span>
              )}
            </p>
            <div className="space-y-3">
              {result.breaches.map((breach, i) => (
                <BreachCard
                  key={breach.id}
                  breach={breach}
                  email={email}
                  selected={selectedIds.has(breach.id)}
                  onToggle={toggleBreach}
                  onGenerateLetter={setSelectedBreach}
                  locked={isFree && i >= FREE_VISIBLE_BREACHES}
                />
              ))}
            </div>
          </div>
        )}

        {result.breaches.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No se encontraron filtraciones
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              Tu email no apareció en ninguna filtración conocida.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <PasswordScanner breaches={result.breaches} />
          <SecurityChecklist breaches={result.breaches} email={email} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar reporte PDF
          </button>
        </div>

        {plan?.plan === "free" && (
          <div className="mt-8 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
              ⭐ Premium — desbloqueá todo
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              {result.totalBreaches > FREE_VISIBLE_BREACHES && (
                <span>Tenés <strong>{result.totalBreaches - FREE_VISIBLE_BREACHES} filtraciones bloqueadas</strong>. </span>
              )}
              Con Premium accedés al reporte completo, cartas de baja ilimitadas, apertura masiva y monitoreo semanal.
            </p>
            <button
              onClick={() => router.push("/premium")}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Ver planes
            </button>
          </div>
        )}
      </div>

      {selectedBreach && (
        <LetterModal
          breach={selectedBreach}
          email={email}
          onClose={() => setSelectedBreach(null)}
          plan={plan}
        />
      )}

      {showBatchModal && (
        <BatchDeletionModal
          breaches={selectedBreaches}
          onClose={() => setShowBatchModal(false)}
        />
      )}

      {selectedBreaches.length > 0 && !showBatchModal && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedBreaches.length} sitio{selectedBreaches.length !== 1 ? "s" : ""} seleccionado{selectedBreaches.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedBreaches.filter((b) => b.deletionUrl).length} con página de baja directa
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMasterLetter}
                  className="px-4 py-2 text-sm font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Carta maestra
                </button>
                <button
                  onClick={handleOpenBatchDeletion}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Abrir páginas de baja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBreaches.length > 0 && <div className="h-24" />}
    </>
  )
}
