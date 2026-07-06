"use client"

import type { Breach } from "@/data/breaches"

interface ExposureSummaryProps {
  breaches: Breach[]
}

interface DataTypeCount {
  type: string
  count: number
  severity: "critical" | "high" | "medium" | "low"
  icon: string
  description: string
}

const dataTypeMap: Record<string, { severity: "critical" | "high" | "medium" | "low"; icon: string; description: string }> = {
  "contraseñas": { severity: "critical", icon: "🔑", description: "Tus contraseñas están expuestas. Cambialas inmediatamente." },
  "passwords": { severity: "critical", icon: "🔑", description: "Tus contraseñas están expuestas. Cambialas inmediatamente." },
  "teléfono": { severity: "high", icon: "📱", description: "Podrías recibir llamadas o SMS de phishing." },
  "phone": { severity: "high", icon: "📱", description: "Podrías recibir llamadas o SMS de phishing." },
  "dni": { severity: "critical", icon: "🪪", description: "Tu documento está expuesto. Vigila tu historial crediticio." },
  "tarjeta": { severity: "critical", icon: "💳", description: "Datos de tarjeta expuestos. Revisá tus movimientos." },
  "dirección": { severity: "high", icon: "📍", description: "Tu dirección física está expuesta." },
  "nombre": { severity: "medium", icon: "👤", description: "Tu nombre completo es conocido." },
  "email": { severity: "medium", icon: "📧", description: "Tu email está en manos de terceros." },
}

function getDataTypeCounts(breaches: Breach[]): DataTypeCount[] {
  const counts = new Map<string, number>()

  for (const breach of breaches) {
    for (const data of breach.compromisedData) {
      const lower = data.toLowerCase()
      for (const [key, value] of Object.entries(dataTypeMap)) {
        if (lower.includes(key)) {
          counts.set(key, (counts.get(key) || 0) + 1)
          break
        }
      }
    }
  }

  const result: DataTypeCount[] = []
  for (const [type, count] of counts.entries()) {
    const meta = dataTypeMap[type]
    result.push({ type, count, ...meta })
  }

  result.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return result
}

const severityColors = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
}

export default function ExposureSummary({ breaches }: ExposureSummaryProps) {
  if (breaches.length === 0) return null

  const dataTypes = getDataTypeCounts(breaches)

  if (dataTypes.length === 0) return null

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
        Qué tipo de datos se expusieron
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dataTypes.map((dt) => (
          <div
            key={dt.type}
            className={`p-3 rounded-lg border ${severityColors[dt.severity]}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium flex items-center gap-2">
                <span>{dt.icon}</span>
                <span className="capitalize">{dt.type}</span>
              </span>
              <span className="text-xs font-bold">{dt.count}</span>
            </div>
            <p className="text-xs opacity-80">{dt.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
