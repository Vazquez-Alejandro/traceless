"use client"

import { useState } from "react"
import type { Breach } from "@/data/breaches"

interface BatchDeletionModalProps {
  breaches: Breach[]
  onClose: () => void
}

export default function BatchDeletionModal({ breaches, onClose }: BatchDeletionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [opened, setOpened] = useState<Set<string>>(new Set())

  const total = breaches.length
  const current = breaches[currentIndex]
  const remaining = total - currentIndex
  const progress = Math.round((currentIndex / total) * 100)

  const openCurrent = () => {
    if (current?.deletionUrl) {
      window.open(current.deletionUrl, "_blank")
      setOpened((prev) => new Set(prev).add(current.id))
    }
    setCurrentIndex((prev) => prev + 1)
  }

  const isDone = currentIndex >= total

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Eliminar datos de {total} sitios
            </h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!isDone ? (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                  <span>{currentIndex} de {total} completados</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {current && (
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      {current.deletionUrl ? (
                        <span className="text-indigo-500">↗</span>
                      ) : (
                        <span className="text-zinc-400">·</span>
                      )}
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{current.name}</span>
                    </div>
                    {opened.has(current.id) && (
                      <span className="text-xs text-green-500 font-medium">Abierto</span>
                    )}
                  </div>
                )}
                {remaining > 1 && (
                  <p className="text-xs text-zinc-400">
                    +{remaining - 1} sitio{remaining - 1 !== 1 ? "s" : ""} restante{remaining - 1 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <button
                onClick={openCurrent}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
              >
                {current?.deletionUrl
                  ? `Abrir página de ${current.name}`
                  : `Marcar como completado (sin página de baja)`}
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✓</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Plan de acción completado
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Procesaste {total} sitio{total !== 1 ? "s" : ""}. Completá el proceso de baja en cada página abierta.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>

        {!isDone && (
          <div className="px-6 pb-4">
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Continuar después
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
