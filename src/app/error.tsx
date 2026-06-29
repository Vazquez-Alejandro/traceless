"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4">⚠</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Algo salió mal
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Ocurrió un error inesperado. Ya lo registramos para solucionarlo.
        </p>
        <button
          onClick={reset}
          className="inline-flex px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  )
}
