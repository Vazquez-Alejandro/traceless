"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import type { SearchResult, Breach } from "@/data/breaches"

interface ClientResult {
  email: string
  status: "pending" | "loading" | "done" | "error"
  result?: SearchResult
  error?: string
}

export default function ClientesPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [input, setInput] = useState("")
  const [clients, setClients] = useState<ClientResult[]>([])
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) { router.push("/sign-in"); return }

    fetch("/api/check-plan")
      .then((r) => r.json())
      .then((d) => {
        setPlan(d.plan)
        if (d.plan !== "pro") router.push("/premium")
      })
  }, [user, isLoaded, router])

  const addClients = () => {
    const emails = input
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"))

    if (emails.length === 0) return
    setInput("")

    const newClients = emails.map((email) => ({
      email,
      status: "pending" as const,
    }))
    setClients((prev) => [...prev, ...newClients])
  }

  const scanAll = async () => {
    setClients((prev) =>
      prev.map((c) => (c.status === "pending" ? { ...c, status: "loading" as const } : c))
    )

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]
      if (client.status !== "loading") continue

      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(client.email)}`)
        if (!res.ok) {
          setClients((prev) =>
            prev.map((c, j) => (j === i ? { ...c, status: "error" as const, error: "Error al buscar" } : c))
          )
          continue
        }
        const data = await res.json()
        setClients((prev) =>
          prev.map((c, j) => (j === i ? { ...c, status: "done" as const, result: data } : c))
        )
      } catch {
        setClients((prev) =>
          prev.map((c, j) => (j === i ? { ...c, status: "error" as const, error: "Error de red" } : c))
        )
      }
    }
  }

  const totalBreaches = clients.reduce(
    (acc, c) => acc + (c.result?.totalBreaches || 0),
    0
  )
  const lettersSent = clients.reduce(
    (acc, c) => acc + (c.result?.breaches.filter((b) => b.hasLetter).length || 0),
    0
  )

  if (!isLoaded || !plan) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-12">
      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/clientes</p>

      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Dashboard multi-cliente
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Gestioná la protección de datos de todos tus clientes desde un solo lugar.
      </p>

      {/* Summary */}
      {clients.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Clientes escaneados</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{clients.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Filtraciones totales</p>
            <p className="text-2xl font-bold text-red-600">{totalBreaches}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Cartas enviadas</p>
            <p className="text-2xl font-bold text-green-600">{lettersSent}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 mb-8">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Agregar clientes (uno por línea o separados por coma)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`cliente1@email.com\ncliente2@email.com\ncliente3@email.com`}
          className="w-full px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
          rows={4}
        />
        <div className="flex gap-3">
          <button
            onClick={addClients}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Agregar
          </button>
          <button
            onClick={scanAll}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Escanear todos
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {clients.map((client, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">
                  {client.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                    {client.email}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {client.status === "pending" && "Pendiente"}
                    {client.status === "loading" && "Escaneando..."}
                    {client.status === "error" && client.error}
                    {client.status === "done" && `${client.result?.totalBreaches || 0} filtraciones`}
                  </p>
                </div>
              </div>
              {client.status === "loading" && (
                <div className="animate-spin h-5 w-5 border-2 border-amber-600 border-t-transparent rounded-full" />
              )}
              {client.status === "done" && client.result && client.result.totalBreaches > 0 && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-full font-medium">
                  {client.result.totalBreaches} encontradas
                </span>
              )}
              {client.status === "done" && client.result && client.result.totalBreaches === 0 && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                  Limpio
                </span>
              )}
            </div>

            {client.status === "done" && client.result && client.result.breaches.length > 0 && (
              <div className="space-y-1.5">
                {client.result.breaches.map((breach) => (
                  <div
                    key={breach.id}
                    className="flex items-center justify-between text-sm bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">●</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{breach.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {breach.hasLetter && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Carta enviada
                        </span>
                      )}
                      {breach.deletionUrl && (
                        <a
                          href={breach.deletionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Gestionar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
