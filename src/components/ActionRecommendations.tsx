"use client"

import type { Breach } from "@/data/breaches"

interface ActionRecommendationsProps {
  breaches: Breach[]
  email: string
}

interface Recommendation {
  priority: "urgent" | "important" | "recommended"
  title: string
  description: string
  action: string
  icon: string
}

function getRecommendations(breaches: Breach[]): Recommendation[] {
  const recommendations: Recommendation[] = []
  const allData = breaches.flatMap((b) => b.compromisedData.map((d) => d.toLowerCase()))

  const hasPasswords = allData.some((d) => d.includes("contraseña") || d.includes("password"))
  const hasPhone = allData.some((d) => d.includes("teléfono") || d.includes("phone"))
  const hasDni = allData.some((d) => d.includes("dni"))
  const hasCard = allData.some((d) => d.includes("tarjeta"))
  const hasAddress = allData.some((d) => d.includes("dirección"))
  const breachCount = breaches.length

  if (hasPasswords) {
    recommendations.push({
      priority: "urgent",
      title: "Cambiar contraseñas expuestas",
      description: "Tus contraseñas fueron filtradas. Si las reusás en otros sitios, están en riesgo.",
      action: "Cambiar contraseñas en todos los sitios afectados y activar autenticación de dos factores (2FA).",
      icon: "🔑",
    })
  }

  if (hasDni) {
    recommendations.push({
      priority: "urgent",
      title: "Monitorear historial crediticio",
      description: "Tu DNI fue expuesto. Podrían intentar abrir cuentas o créditos a tu nombre.",
      action: "Consultá tu historial en Veraz o Nosis y considerá poner una alerta de robo de identidad.",
      icon: "🪪",
    })
  }

  if (hasCard) {
    recommendations.push({
      priority: "urgent",
      title: "Revisar movimientos bancarios",
      description: "Datos de tarjeta de crédito fueron expuestos.",
      action: "Revisá tus últimos movimientos y reportá cualquier cargo sospechoso a tu banco.",
      icon: "💳",
    })
  }

  if (hasPhone) {
    recommendations.push({
      priority: "important",
      title: "Prevenir phishing por SMS y llamadas",
      description: "Tu número de teléfono fue filtrado. Podrías recibir intentos de fraude.",
      action: "No hagas clic en links de SMS desconocidos y no compartas datos por llamada.",
      icon: "📱",
    })
  }

  if (hasAddress) {
    recommendations.push({
      priority: "important",
      title: "Cuidado con fraudes físicos",
      description: "Tu dirección postal fue expuesta.",
      action: "Estate atento a paquetes o documentos que no solicitaste.",
      icon: "📍",
    })
  }

  if (breachCount >= 10) {
    recommendations.push({
      priority: "important",
      title: "Considerar cambio de email",
      description: `Tu email apareció en ${breachCount} filtraciones. Es alto riesgo.`,
      action: "Creá un nuevo email para cuentas importantes y dejá este solo para registros no críticos.",
      icon: "📧",
    })
  }

  recommendations.push({
    priority: "recommended",
    title: "Activar monitoreo semanal",
    description: "Recibirás alertas cuando tu email aparezca en nuevas filtraciones.",
    action: "Activá el monitoreo en Traceless para estar protegido a futuro.",
    icon: "🛡️",
  })

  recommendations.push({
    priority: "recommended",
    title: "Enviar cartas de eliminación",
    description: "Podés exigir legalmente la eliminación de tus datos bajo la Ley 25.326.",
    action: "Generá y enviá cartas de baja a los sitios más comprometidos.",
    icon: "✉️",
  })

  return recommendations
}

const priorityStyles = {
  urgent: "border-l-red-500 bg-red-50 dark:bg-red-900/10",
  important: "border-l-orange-500 bg-orange-50 dark:bg-orange-900/10",
  recommended: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10",
}

const priorityLabels = {
  urgent: "Urgente",
  important: "Importante",
  recommended: "Recomendado",
}

const priorityColors = {
  urgent: "text-red-600 dark:text-red-400",
  important: "text-orange-600 dark:text-orange-400",
  recommended: "text-blue-600 dark:text-blue-400",
}

export default function ActionRecommendations({ breaches, email }: ActionRecommendationsProps) {
  if (breaches.length === 0) return null

  const recommendations = getRecommendations(breaches)

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Qué hacer ahora
      </h3>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className={`border-l-4 p-4 rounded-r-lg ${priorityStyles[rec.priority]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{rec.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase ${priorityColors[rec.priority]}`}>
                    {priorityLabels[rec.priority]}
                  </span>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {rec.title}
                  </h4>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  {rec.description}
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">
                  {rec.action}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
