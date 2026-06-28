import { useRouter } from "next/navigation"
import type { Breach } from "@/data/breaches"

interface BreachCardProps {
  breach: Breach
  email: string
  selected: boolean
  onToggle: (id: string) => void
  onGenerateLetter: (breach: Breach) => void
  locked?: boolean
}

const categoryColors: Record<string, string> = {
  "Redes Sociales": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Tecnología": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Comercio": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Finanzas": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Entretenimiento": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Diseño": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Juegos": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "Almacenamiento": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Música": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Comida": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Viajes": "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  "Social": "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
}

export default function BreachCard({ breach, email, selected, onToggle, onGenerateLetter, locked }: BreachCardProps) {
  const router = useRouter()
  const colorClass = categoryColors[breach.category] || "bg-gray-100 text-gray-700"

  return (
    <div className="relative border rounded-xl p-5 transition-all overflow-hidden
      border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className={`transition-all ${locked ? "blur-sm select-none" : ""}`}>
        <div className="flex items-start gap-3 mb-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(breach.id)}
            disabled={locked}
            className="mt-1 h-5 w-5 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{breach.name}</h3>
                {breach.hasLetter && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Carta enviada
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{breach.domain}</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${colorClass}`}>
            {breach.category}
          </span>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3 leading-relaxed ml-8">{breach.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4 ml-8">
          {breach.compromisedData.map((data) => (
            <span
              key={data}
              className="text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md"
            >
              {data}
            </span>
          ))}
        </div>

        {breach.hasLetter && (
          <div className="ml-8 mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Todavía no borraron tus datos
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Ya enviaste una carta el {new Date(breach.letterCreatedAt!).toLocaleDateString("es-AR")} y seguís apareciendo. Reenviá la carta para presionar nuevamente.
            </p>
          </div>
        )}

      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 ml-8">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {new Date(breach.date).toLocaleDateString("es-AR")}
          </span>
          {breach.deletionUrl && (
            <a
              href={breach.deletionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 underline"
            >
              Página de baja
            </a>
          )}
          {breach.privacyEmail && (
            <a
              href={`mailto:${breach.privacyEmail}?subject=Solicitud de eliminación de datos personales - RGPD`}
              className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 underline"
            >
              Enviar email
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {breach.hasLetter && breach.letterCreatedAt && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">
              {new Date(breach.letterCreatedAt).toLocaleDateString("es-AR")}
            </span>
          )}
          <button
            onClick={() => onGenerateLetter(breach)}
            disabled={locked}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors disabled:opacity-0"
          >
            {breach.hasLetter ? "Reenviar carta →" : "Carta de baja →"}
          </button>
        </div>
      </div>
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[2px]">
          <div className="text-center px-6">
            <svg className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Resultado bloqueado</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Actualizá a Premium para ver todas las filtraciones y generar cartas de baja.</p>
            <button
              onClick={() => router.push("/premium")}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Ver planes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
