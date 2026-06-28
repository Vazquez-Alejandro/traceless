import type { Breach } from "@/data/breaches"

interface SecurityChecklistProps {
  breaches: Breach[]
  email: string
}

interface ChecklistItem {
  id: string
  action: string
  detail: string
  priority: "high" | "medium" | "low"
}

export default function SecurityChecklist({ breaches, email }: SecurityChecklistProps) {
  const items: ChecklistItem[] = []
  const seen = new Set<string>()

  for (const breach of breaches) {
    const hasPasswords = breach.compromisedData.some((d) => d.toLowerCase().includes("contrase"))
    const hasEmail = breach.compromisedData.some((d) => d.toLowerCase() === "emails")
    const hasPhone = breach.compromisedData.some((d) => d.toLowerCase().includes("teléfono"))
    const hasDni = breach.compromisedData.some((d) => d === "DNI")
    const hasAddress = breach.compromisedData.some((d) => d.toLowerCase().includes("direcc"))
    const hasCard = breach.compromisedData.some((d) => d.toLowerCase().includes("tarjeta"))
    const hasSsn = breach.compromisedData.some((d) => d.toLowerCase().includes("seguro social"))

    if (hasPasswords && !seen.has("password")) {
      seen.add("password")
      items.push({
        id: "password",
        action: "Cambiá las contraseñas filtradas",
        detail: `Tu contraseña de ${breach.name} podría estar en manos de terceros. Usá un gestor de contraseñas y activá 2FA.`,
        priority: "high",
      })
    }

    if (hasEmail && !seen.has("email")) {
      seen.add("email")
      items.push({
        id: "email",
        action: "Mantené tu email vigilado",
        detail: "Tu dirección de email está en circulación. Activá el monitoreo semanal de TraceLess para recibir alertas de nuevas filtraciones.",
        priority: "medium",
      })
    }

    if (hasPhone && !seen.has("phone")) {
      seen.add("phone")
      items.push({
        id: "phone",
        action: "Protegé tu número de teléfono",
        detail: "Registrate en el Registro Nacional No Llame (RNBD) para evitar llamadas de telemarketing.",
        priority: "medium",
      })
    }

    if (hasDni && !seen.has("dni")) {
      seen.add("dni")
      items.push({
        id: "dni",
        action: "Monitoreá uso indebido de tu DNI",
        detail: "Tu documento fue expuesto. Monitoreá tu historial crediticio y cualquier movimiento sospechoso en el BCRA o Veraz.",
        priority: "high",
      })
    }

    if (hasAddress && !seen.has("address")) {
      seen.add("address")
      items.push({
        id: "address",
        action: "Verificá tu dirección física",
        detail: "Tu domicilio fue filtrado. Estate atento a correo postal sospechoso o suplantación de identidad.",
        priority: "low",
      })
    }

    if (hasCard && !seen.has("card")) {
      seen.add("card")
      items.push({
        id: "card",
        action: "Revisá tus tarjetas de crédito",
        detail: "Datos de tarjeta fueron expuestos. Revisá los últimos movimientos y considera solicitar un reemplazo.",
        priority: "high",
      })
    }

    if (hasSsn && !seen.has("ssn")) {
      seen.add("ssn")
      items.push({
        id: "ssn",
        action: "Congelá tu informe crediticio",
        detail: "Tu número de seguro social fue filtrado. Congelá tu crédito en las centrales de riesgo para evitar fraudes.",
        priority: "high",
      })
    }

    if (breach.deletionUrl && !seen.has("deletion")) {
      seen.add("deletion")
      items.push({
        id: `deletion-${breach.id}`,
        action: `Solicitá la baja en ${breach.name}`,
        detail: `Usá la carta de baja de TraceLess para pedir la eliminación de tus datos de ${breach.name}.`,
        priority: "high",
      })
    }
  }

  const sorted = items.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  const priorityColors = {
    high: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10",
    medium: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10",
    low: "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
  }

  const priorityBadge = {
    high: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-zinc-400",
  }

  if (items.length === 0) return null

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 bg-white dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Checklist de seguridad
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        {items.length} acción{items.length !== 1 ? "es" : ""} recomendada{items.length !== 1 ? "s" : ""} para {email}
      </p>

      <div className="space-y-2">
        {sorted.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 ${priorityColors[item.priority]}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityBadge[item.priority]}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.action}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
