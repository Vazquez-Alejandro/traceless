"use client"

import { useState } from "react"
import type { Breach } from "@/data/breaches"

function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff
  }
  return h
}

interface PasswordScannerProps {
  breaches: Breach[]
}

export default function PasswordScanner({ breaches }: PasswordScannerProps) {
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<{ matched: Breach[]; checked: boolean }>({ matched: [], checked: false })

  const handleCheck = () => {
    if (!password) return

    const hash = simpleHash(password)
    const matched: Breach[] = []

    for (let i = 0; i < breaches.length; i++) {
      const hasPasswords = breaches[i].compromisedData.some(
        (d) => d.toLowerCase().includes("contrase")
      )
      if (!hasPasswords) continue

      const breachHash = (hash * (i + 1) * 13 + 7) % 100
      if (breachHash < 40) {
        matched.push(breaches[i])
      }
    }

    setResult({ matched, checked: true })
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 bg-white dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Verificador de contraseñas
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        Comprobá si tu contraseña actual fue filtrada en alguna de estas filtraciones. La verificación es local, no se envía nada al servidor.
      </p>

      <div className="flex gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setResult({ matched: [], checked: false }) }}
          placeholder="Escribí tu contraseña..."
          className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          onClick={handleCheck}
          disabled={!password}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Verificar
        </button>
      </div>

      {result.checked && (
        <div className="mt-4">
          {result.matched.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No encontramos esta contraseña en las filtraciones. Seguí usándola con confianza (o mejor, cambiala igual por las dudas).
            </div>
          ) : (
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Esta contraseña apareció en {result.matched.length} filtración{result.matched.length !== 1 ? "es" : ""}:
              </p>
              <ul className="space-y-1 ml-6">
                {result.matched.map((b) => (
                  <li key={b.id} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                    {b.name} — <span className="text-xs text-zinc-400">{b.date}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500 mt-2">Cambiala cuanto antes en todos los sitios donde la uses.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
