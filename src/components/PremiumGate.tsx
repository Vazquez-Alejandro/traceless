"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

interface PremiumGateProps {
  feature: "batchDeletion" | "monitoring" | "letters"
  limit?: number
  used?: number
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function PremiumGate({ feature, limit, used, children, fallback }: PremiumGateProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  if (!isLoaded) return null

  if (!user && feature === "letters") {
    return (
      <>
        {fallback || (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-500 mb-2">Iniciá sesión para generar cartas de baja</p>
            <button
              onClick={() => router.push("/sign-in")}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Iniciar sesión →
            </button>
          </div>
        )}
      </>
    )
  }

  if (feature === "batchDeletion") {
    return (
      <>
        {fallback || (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-center">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Premium</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              La apertura masiva de páginas de baja está disponible solo en el plan Premium.
            </p>
            <button
              onClick={() => router.push("/premium")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Actualizar a Premium
            </button>
          </div>
        )}
      </>
    )
  }

  if (feature === "letters" && limit !== undefined && used !== undefined && used >= limit) {
    return (
      <>
        {fallback || (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-center">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Límite alcanzado
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              Usaste {used} de {limit} cartas este mes. Actualizá a Premium para cartas ilimitadas.
            </p>
            <button
              onClick={() => router.push("/premium")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Actualizar a Premium
            </button>
          </div>
        )}
      </>
    )
  }

  return <>{children}</>
}
