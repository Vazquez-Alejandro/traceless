"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

interface CompanyData {
  name: string
  cuit: string
  industry: string
  employeeCount: string
  dataTypes: string[]
  hasDPO: boolean
  dpoName: string
  dpoEmail: string
  privacyPolicyUrl: string
  website: string
}

const INDUSTRIES = [
  "Tecnología / Software",
  "E-commerce / Retail",
  "Salud / Farmacéutica",
  "Finanzas / Banking",
  "Educación",
  "Marketing / Publicidad",
  "Recursos Humanos",
  "Legal / Consultoría",
  "Manufactura / Industria",
  "Servicios / Otro",
]

const DATA_TYPES = [
  "Nombres y apellidos",
  "DNI / Documentos",
  "Email",
  "Teléfono",
  "Dirección",
  "Datos de salud",
  "Datos financieros",
  "Geolocalización",
  "Cookies / Navegación",
  "Redes sociales",
  "Menores de edad",
]

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState<CompanyData>({
    name: "",
    cuit: "",
    industry: "",
    employeeCount: "",
    dataTypes: [],
    hasDPO: false,
    dpoName: "",
    dpoEmail: "",
    privacyPolicyUrl: "",
    website: "",
  })

  useEffect(() => {
    if (user) {
      fetch("/api/company")
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            router.push("/dashboard")
          } else {
            setLoading(false)
          }
        })
        .catch(() => setLoading(false))
    }
  }, [user, router])

  const handleChange = (field: keyof CompanyData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDataTypeToggle = (type: string) => {
    const current = formData.dataTypes
    if (current.includes(type)) {
      handleChange("dataTypes", current.filter(t => t !== type))
    } else {
      handleChange("dataTypes", [...current, type])
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  const canProceed = () => {
    if (step === 1) return formData.name && formData.cuit && formData.industry
    if (step === 2) return formData.dataTypes.length > 0
    return true
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Configurá tu Empresa</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Paso {step} de 3
          </p>
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">Información de la Empresa</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nombre de la empresa *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange("name", e.target.value)}
                  placeholder="Mi Empresa S.A."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  CUIT *
                </label>
                <input
                  type="text"
                  value={formData.cuit}
                  onChange={e => handleChange("cuit", e.target.value)}
                  placeholder="20-12345678-9"
                  maxLength={13}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Rubro / Industria *
                </label>
                <select
                  value={formData.industry}
                  onChange={e => handleChange("industry", e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccioná un rubro</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Cantidad de empleados
                </label>
                <select
                  value={formData.employeeCount}
                  onChange={e => handleChange("employeeCount", e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccioná un rango</option>
                  <option value="1-10">1 - 10</option>
                  <option value="11-50">11 - 50</option>
                  <option value="51-200">51 - 200</option>
                  <option value="201-500">201 - 500</option>
                  <option value="500+">Más de 500</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Sitio web
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={e => handleChange("website", e.target.value)}
                  placeholder="https://miempresa.com"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Data Types */}
        {step === 2 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">¿Qué datos tratás?</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Seleccioná todos los tipos de datos personales que recopilás o procesás
            </p>

            <div className="grid grid-cols-2 gap-3">
              {DATA_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => handleDataTypeToggle(type)}
                  className={`p-4 rounded-xl border text-left text-sm font-medium transition-colors ${
                    formData.dataTypes.includes(type)
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-blue-300"
                  }`}
                >
                  {formData.dataTypes.includes(type) && <span className="mr-2">✓</span>}
                  {type}
                </button>
              ))}
            </div>

            {formData.dataTypes.length > 0 && (
              <p className="mt-4 text-sm text-blue-600 dark:text-blue-400">
                {formData.dataTypes.length} tipo{formData.dataTypes.length !== 1 && "s"} seleccionado{formData.dataTypes.length !== 1 && "s"}
              </p>
            )}
          </div>
        )}

        {/* Step 3: DPO & Policy */}
        {step === 3 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">Responsable y Política</h2>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleChange("hasDPO", !formData.hasDPO)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    formData.hasDPO ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                    formData.hasDPO ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    ¿Tenés un Responsable de Protección de Datos (DPO)?
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Designación recomendada para empresas que tratan datos sensibles
                  </p>
                </div>
              </div>

              {formData.hasDPO && (
                <div className="grid gap-4 pl-15">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Nombre del DPO
                    </label>
                    <input
                      type="text"
                      value={formData.dpoName}
                      onChange={e => handleChange("dpoName", e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Email del DPO
                    </label>
                    <input
                      type="email"
                      value={formData.dpoEmail}
                      onChange={e => handleChange("dpoEmail", e.target.value)}
                      placeholder="dpo@miempresa.com"
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  URL de tu Política de Privacidad (opcional)
                </label>
                <input
                  type="url"
                  value={formData.privacyPolicyUrl}
                  onChange={e => handleChange("privacyPolicyUrl", e.target.value)}
                  placeholder="https://miempresa.com/privacidad"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Si no tenés una, podemos generarla por vos en el dashboard
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
            >
              ← Anterior
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
            >
              {saving ? "Guardando..." : "Guardar y Continuar"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
