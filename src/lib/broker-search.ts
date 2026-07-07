import { ARGENTINE_BROKERS, type DataBroker, type BrokerSearchResult } from "@/data/brokers"

export async function searchBrokers(query: string): Promise<BrokerSearchResult[]> {
  const results: BrokerSearchResult[] = []

  for (const broker of ARGENTINE_BROKERS) {
    const result = await searchBroker(broker, query)
    results.push(result)
  }

  return results
}

async function searchBroker(broker: DataBroker, query: string): Promise<BrokerSearchResult> {
  try {
    const response = await fetch(`/api/broker-search?broker=${broker.id}&query=${encodeURIComponent(query)}`)
    if (!response.ok) {
      return {
        broker,
        found: false,
        dataFound: [],
        confidence: 0
      }
    }
    return await response.json()
  } catch {
    return {
      broker,
      found: false,
      dataFound: [],
      confidence: 0
    }
  }
}

export function getRemovalInstructions(broker: DataBroker): string {
  switch (broker.removalMethod) {
    case "form":
      return `Completá el formulario de baja en ${broker.removalUrl}. Necesitás tu DNI y nombre completo.`
    case "email":
      return `Enviá un email a ${broker.removalEmail} solicitando la eliminación de tus datos personales bajo la Ley 25.326.`
    case "phone":
      return `Llamá al número de contacto de ${broker.name} y solicitá la baja de tus datos.`
    default:
      return `Contactá a ${broker.name} para solicitar la eliminación de tus datos.`
  }
}

export function calculateBrokerRiskScore(results: BrokerSearchResult[]): number {
  let score = 0

  for (const result of results) {
    if (result.found) {
      score += 25

      const hasSensitiveData = result.dataFound.some(d =>
        d.toLowerCase().includes("dni") ||
        d.toLowerCase().includes("deudas") ||
        d.toLowerCase().includes("expedientes") ||
        d.toLowerCase().includes("judicial")
      )
      if (hasSensitiveData) score += 15

      const hasContactData = result.dataFound.some(d =>
        d.toLowerCase().includes("teléfono") ||
        d.toLowerCase().includes("domicilio") ||
        d.toLowerCase().includes("email")
      )
      if (hasContactData) score += 10
    }
  }

  return Math.min(100, score)
}

export function getBrokerStats(results: BrokerSearchResult[]): {
  totalBrokers: number
  foundBrokers: number
  totalDataTypes: number
  riskLevel: "bajo" | "medio" | "alto" | "crítico"
} {
  const foundBrokers = results.filter(r => r.found)
  const totalDataTypes = foundBrokers.reduce((sum, r) => sum + r.dataFound.length, 0)
  const riskScore = calculateBrokerRiskScore(results)

  let riskLevel: "bajo" | "medio" | "alto" | "crítico"
  if (riskScore < 25) riskLevel = "bajo"
  else if (riskScore < 50) riskLevel = "medio"
  else if (riskScore < 75) riskLevel = "alto"
  else riskLevel = "crítico"

  return {
    totalBrokers: results.length,
    foundBrokers: foundBrokers.length,
    totalDataTypes,
    riskLevel
  }
}
