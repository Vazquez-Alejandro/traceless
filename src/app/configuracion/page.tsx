"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ConfiguracionPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [dni, setDni] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) { router.push("/sign-in"); return }

    setName(user.fullName || user.firstName || "")
  }, [user, isLoaded, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress || "",
          name,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      console.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-12">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/configuracion</p>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Configuración</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Tus datos se usarán para autocompletar las cartas de baja.
        </p>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Dirección (opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Tu dirección"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              DNI / Pasaporte (opcional)
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Tu documento"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
