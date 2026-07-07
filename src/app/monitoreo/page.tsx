"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/Toast"

interface MonitoredBroker {
  id: string
  broker: string
  active: boolean
  created_at: string
  last_checked_at: string | null
  status: "pending" | "clean" | "found"
}

export default function MonitoreoPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [monitored, setMonitored] = useState<MonitoredBroker[]>([])
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<"free" | "basico" | "pro">("free")
  const [newDni, setNewDni] = useState("")
  const [adding, setAdding] = useState(false)
  const [planLoading, setPlanLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      router.push("/sign-in")
      return
    }

    fetch("/api/check-plan")
      .then((r) => r.json())
      .then((d) => {
        setPlan(d.plan)
        setPlanLoading(false)
      })
      .catch(() => setPlanLoading(false))

    fetch("/api/monitor/brokers")
      .then((r) => r.json())
      .then((d) => {
        setMonitored(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, isLoaded, router])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDni.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/monitor/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: newDni }),
      })
      if (res.status === 403) {
        const d = await res.json()
        toast(d.error, "error")
        return
      }
      setNewDni("")
      const data = await fetch("/api/monitor/brokers").then((r) => r.json())
      setMonitored(Array.isArray(data) ? data : [])
    } catch {
      console.error("Error")
    } finally {
      setAdding(false)
    }
  }

  const handleUnsubscribe = async (id: string) => {
    try {
      await fetch("/api/monitor/brokers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await fetch("/api/monitor/brokers").then((r) => r.json())
      setMonitored(Array.isArray(data) ? data : [])
    } catch {
      console.error("Error")
    }
  }

  if (!isLoaded || loading || planLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  if (plan === "free") {
    return (
      <main className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/monitoreo</p>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Monitoreo mensual</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
            El monitoreo está disponible en planes Básico y Pro. Verificamos mensualmente si tus datos siguen apareciendo en las bases de datos.
          </p>
          <button
            onClick={() => router.push("/premium")}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
          >
            Ver planes
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-12">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/monitoreo</p>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Monitoreo mensual</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Verificamos mensualmente si tus datos siguen apareciendo en las bases de datos argentinas.
        </p>

        <form onSubmit={handleSubscribe} className="flex gap-3 mb-10">
          <input
            type="text"
            value={newDni}
            onChange={(e) => setNewDni(e.target.value)}
            placeholder="Tu DNI (ej: 12345678)"
            className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition-colors"
            required
          />
          <button
            type="submit"
            disabled={adding || !newDni.trim()}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {adding ? "Agregando..." : "Vigilar"}
          </button>
        </form>

        {monitored.filter((m) => m.active).length === 0 ? (
          <div className="text-center py-12 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <p className="text-zinc-500 dark:text-zinc-400">No tenés ningún DNI vigilado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monitored.filter((m) => m.active).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    m.status === "clean" ? "bg-green-500" :
                    m.status === "found" ? "bg-red-500" :
                    "bg-yellow-500"
                  }`} />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{m.broker}</p>
                    <p className="text-xs text-zinc-400">
                      {m.last_checked_at
                        ? `Último chequeo: ${new Date(m.last_checked_at).toLocaleDateString("es-AR")}`
                        : "Pendiente de primer chequeo"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnsubscribe(m.id)}
                  className="text-xs px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Desuscribir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
