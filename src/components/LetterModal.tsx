"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import type { Breach } from "@/data/breaches"
import { generateDeletionLetter, PROFILE_KEY } from "@/lib/letters"
import type { UserProfile } from "@/lib/letters"

interface PlanInfo {
  plan: "free" | "premium"
  lettersUsed: number
  lettersLimit: number | "∞"
}

interface LetterModalProps {
  breach: Breach
  email: string
  onClose: () => void
  plan?: PlanInfo
}

export default function LetterModal({ breach, email, onClose, plan }: LetterModalProps) {
  const { user } = useUser()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined)
  const [letter, setLetter] = useState("")
  const [mode, setMode] = useState<"generada" | "personalizada">("generada")

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY)
      if (raw) setProfile(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (mode === "generada") {
      setLetter(generateDeletionLetter(email, breach, profile))
    }
  }, [email, breach, profile, mode])

  const handleCopy = async () => {
    if (!user) {
      router.push("/sign-in")
      return
    }

    if (plan?.plan === "free" && plan.lettersUsed >= (plan.lettersLimit as number)) {
      router.push("/premium")
      return
    }

    setSaving(true)
    try {
      await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breachId: breach.id, email }),
      })
    } catch {
      // si falla, igual copiamos
    } finally {
      setSaving(false)
    }

    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lettersLeft = plan && plan.lettersLimit !== "∞"
    ? plan.lettersLimit - plan.lettersUsed
    : null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Carta de baja - {breach.name}
              </h2>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setMode("generada"); setLetter(generateDeletionLetter(email, breach, profile)) }}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${mode === "generada" ? "bg-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
                >
                  Generada
                </button>
                <button
                  onClick={() => { setMode("personalizada"); setLetter("") }}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${mode === "personalizada" ? "bg-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
                >
                  Personalizada
                </button>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {lettersLeft !== null && lettersLeft <= 1 && (
          <div className="mx-6 mt-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            {lettersLeft === 0
              ? "Límite de cartas alcanzado este mes. Actualizá a Premium para cartas ilimitadas."
              : `Te queda ${lettersLeft} carta este mes.`}
          </div>
        )}

        <div className="overflow-y-auto p-6 flex-1">
          {mode === "generada" && (
            <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>Importante:</strong> tus datos personales (nombre{profile?.address ? ", dirección" : ""}{profile?.dni ? ", DNI" : ""}) se completaron automáticamente con la información de tu perfil.
              Revisá que todo esté correcto antes de enviar la carta. Podés actualizar tus datos en{" "}
              <a href="/configuracion" className="underline font-medium">Configuración</a>.
            </div>
          )}
          {mode === "personalizada" && (
            <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Redactá tu propia carta de baja desde cero. El texto que escribas se copiará tal cual al portapapeles.
            </div>
          )}
          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            placeholder={mode === "personalizada" ? "Escribí tu carta personalizada aquí..." : ""}
            className="w-full h-96 text-sm text-zinc-700 dark:text-zinc-300 bg-transparent font-sans leading-relaxed resize-none focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between p-6 border-t border-zinc-200 dark:border-zinc-700">
          {plan?.plan === "free" && plan.lettersLimit !== "∞" && (
            <span className="text-xs text-zinc-400">
              {plan.lettersUsed}/{plan.lettersLimit} cartas usadas este mes
            </span>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              Cerrar
            </button>
            {plan?.plan === "free" && plan.lettersUsed >= (plan.lettersLimit as number) ? (
              <button
                onClick={() => router.push("/premium")}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Actualizar a Premium
              </button>
            ) : (
              <button
                onClick={handleCopy}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : copied ? (
                  <>Copiado</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar carta
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
