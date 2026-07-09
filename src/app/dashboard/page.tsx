"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"

interface ComplianceData {
  score: number
  answers: Record<number, boolean>
  lastUpdated: string | null
  companyName: string
  industry: string
}

const CATEGORIES = {
  documentacion: { label: "Documentación", color: "blue" },
  consentimiento: { label: "Consentimiento", color: "emerald" },
  seguridad: { label: "Seguridad", color: "red" },
  organizacion: { label: "Organización", color: "purple" },
  minimizacion: { label: "Minimización", color: "amber" },
  derechos: { label: "Derechos", color: "cyan" },
  terceros: { label: "Terceros", color: "pink" },
  internacional: { label: "Internacional", color: "indigo" },
}

const QUESTIONS = [
  { id: 1, question: "¿Tu empresa tiene una política de privacidad publicada?", category: "documentacion", weight: 10 },
  { id: 2, question: "¿Capturás consentimiento explícito antes de recopilar datos?", category: "consentimiento", weight: 15 },
  { id: 3, question: "¿Tenés un registro de todas las actividades de tratamiento?", category: "documentacion", weight: 10 },
  { id: 4, question: "¿Notificás a los titulares en caso de brecha de seguridad?", category: "seguridad", weight: 15 },
  { id: 5, question: "¿Tenés designado un responsable de protección de datos?", category: "organizacion", weight: 8 },
  { id: 6, question: "¿Realizás evaluaciones de impacto para tratamientos de alto riesgo?", category: "seguridad", weight: 10 },
  { id: 7, question: "¿Los datos se almacenan solo el tiempo necesario?", category: "minimizacion", weight: 8 },
  { id: 8, question: "¿Tenés procedimientos para responder solicitudes de titulares?", category: "derechos", weight: 12 },
  { id: 9, question: "¿Los terceros que tratan datos tienen contratos de confidencialidad?", category: "terceros", weight: 8 },
  { id: 10, question: "¿Capacitás a tu personal en protección de datos?", category: "organizacion", weight: 5 },
  { id: 11, question: "¿Tenés un protocolo de respuesta ante incidentes?", category: "seguridad", weight: 12 },
  { id: 12, question: "¿Los datos sensibles tienen protección reforzada?", category: "seguridad", weight: 15 },
  { id: 13, question: "¿Podés eliminar datos de un titular bajo solicitud?", category: "derechos", weight: 15 },
  { id: 14, question: "¿Transferís datos al exterior? Si es así, ¿con garantías?", category: "internacional", weight: 8 },
  { id: 15, question: "¿Tenés documentada la base legal para cada tratamiento?", category: "documentacion", weight: 12 },
]

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-500"
  if (score >= 60) return "text-amber-500"
  if (score >= 40) return "text-orange-500"
  return "text-red-500"
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excelente"
  if (score >= 60) return "Bueno"
  if (score >= 40) return "Regular"
  return "Crítico"
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500"
  if (score >= 60) return "bg-amber-500"
  if (score >= 40) return "bg-orange-500"
  return "bg-red-500"
}

export default function DashboardPage() {
  const { user } = useUser()
  const [compliance, setCompliance] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchCompliance()
    }
  }, [user])

  const fetchCompliance = async () => {
    try {
      const res = await fetch("/api/compliance")
      if (res.ok) {
        const data = await res.json()
        setCompliance(data)
      }
    } catch {}
    setLoading(false)
  }

  const handleAnswer = async (questionId: number, answer: boolean) => {
    if (!compliance) return

    const newAnswers = { ...compliance.answers, [questionId]: answer }
    const newScore = calculateScore(newAnswers)

    setCompliance({
      ...compliance,
      answers: newAnswers,
      score: newScore,
    })

    setSaving(true)
    try {
      await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: newAnswers, score: newScore }),
      })
    } catch {}
    setSaving(false)
  }

  const calculateScore = (answers: Record<number, boolean>) => {
    let totalWeight = 0
    let achievedWeight = 0

    for (const q of QUESTIONS) {
      totalWeight += q.weight
      if (answers[q.id]) {
        achievedWeight += q.weight
      }
    }

    return Math.round((achievedWeight / totalWeight) * 100)
  }

  const getCategoryScore = (category: string) => {
    if (!compliance) return 0
    const catQuestions = QUESTIONS.filter(q => q.category === category)
    const catAnswers = catQuestions.filter(q => compliance.answers[q.id])
    return Math.round((catAnswers.length / catQuestions.length) * 100)
  }

  const getRecommendations = () => {
    if (!compliance) return []
    const recs = []
    for (const q of QUESTIONS) {
      if (!compliance.answers[q.id]) {
        recs.push(q)
      }
    }
    return recs.slice(0, 5)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!compliance) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Bienvenido a Traceless</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">Empezá completando tu perfil de empresa</p>
          <Link
            href="/onboarding"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Configurar empresa
          </Link>
        </div>
      </div>
    )
  }

  const recommendations = getRecommendations()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard de Cumplimiento</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{compliance.companyName}</p>
            </div>
            <div className="flex items-center gap-4">
              {saving && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Guardando...</span>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium rounded-lg transition-colors text-sm"
              >
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Score Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-zinc-200 dark:text-zinc-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(compliance.score / 100) * 352} 352`}
                  className={getScoreColor(compliance.score)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(compliance.score)}`}>{compliance.score}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">/ 100</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Score de Cumplimiento: {getScoreLabel(compliance.score)}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {compliance.score >= 80
                  ? "Tu empresa está bien posicionada. Mantené las prácticas actuales."
                  : compliance.score >= 60
                  ? "Buen avance. Revisá las áreas pendientes para mejorar."
                  : "Hay áreas críticas que necesitan atención urgente."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {Object.entries(CATEGORIES).map(([key, cat]) => {
                  const score = getCategoryScore(key)
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeCategory === key
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {cat.label}: {score}%
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checklist */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Checklist de Cumplimiento</h3>
              <div className="space-y-4">
                {QUESTIONS.filter(q => !activeCategory || q.category === activeCategory).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <button
                      onClick={() => handleAnswer(q.id, !compliance.answers[q.id])}
                      className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        compliance.answers[q.id]
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-zinc-300 dark:border-zinc-600 hover:border-blue-400"
                      }`}
                    >
                      {compliance.answers[q.id] && <span className="text-xs">✓</span>}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-900 dark:text-white">{q.question}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {CATEGORIES[q.category as keyof typeof CATEGORIES].label} • Peso: {q.weight}pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recommendations */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Acciones Recomendadas</h3>
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((q) => (
                    <div key={q.id} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">{q.question}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">¡Felicitaciones! Completaste todas las preguntas.</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Acciones Rápidas</h3>
              <div className="space-y-3">
                <Link
                  href="/dashboard/policy"
                  className="block p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Generar Política de Privacidad</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">PDF válido bajo Ley 25.326</p>
                </Link>
                <Link
                  href="/dashboard/activities"
                  className="block p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Registrar Actividades</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Documentá qué datos tratás</p>
                </Link>
                <Link
                  href="/dashboard/consents"
                  className="block p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Gestionar Consentimientos</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Registrá quién aceptó qué</p>
                </Link>
              </div>
            </div>

            {/* Last Updated */}
            {compliance.lastUpdated && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                Última actualización: {new Date(compliance.lastUpdated).toLocaleDateString("es-AR")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
