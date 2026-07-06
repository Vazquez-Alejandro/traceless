import { type Breach, type SearchResult, KNOWN_BREACHES, SAFE_SITES } from "@/data/breaches"

interface XposedOrNotResponse {
  breaches: string[][]
  email: string
  status: string
}

interface XposedOrNotAnalyticsResponse {
  ExposedEmail: {
    breach_summary: {
      breaches_count: number
      records_count: number
    }
    breaches_details: Array<{
      breach: string
      domain: string
      industry: string
      logo: string
      password_risk: string
      searchable: string
      verified: string
      xposed_data: string
      xposed_date: string
      xposed_records: number
    }>
  }
}

const XON_API_BASE = "https://api.xposedornot.com/v1"

const industryToCategory: Record<string, string> = {
  "Information Technology": "Tecnología",
  "Retail": "Comercio",
  "Entertainment": "Entretenimiento",
  "Finance": "Finanzas",
  "Social": "Redes Sociales",
  "Education": "Educación",
  "Health Care": "Salud",
  "Transport": "Viajes",
  "Music": "Música",
  "Telecommunication": "Telecomunicaciones",
  "Non-Profit/Charities": "Sin fines de lucro",
  "Electronics": "Electrónica",
  "Miscellaneous": "Otros",
}

function mapXonDataToBreach(xonBreach: string, analytics?: XposedOrNotAnalyticsResponse): Breach {
  const knownBreach = KNOWN_BREACHES.find(
    (b) => b.name.toLowerCase() === xonBreach.toLowerCase()
  )

  if (knownBreach) {
    return knownBreach
  }

  const details = analytics?.ExposedEmail?.breaches_details?.find(
    (d) => d.breach.toLowerCase() === xonBreach.toLowerCase()
  )

  const compromisedData = details?.xposed_data
    ? details.xposed_data.split(";").map((d) => d.trim())
    : ["Emails"]

  const category = details?.industry
    ? industryToCategory[details.industry] || "Otros"
    : "Otros"

  return {
    id: xonBreach.toLowerCase().replace(/\s+/g, "-"),
    name: xonBreach,
    domain: details?.domain || "unknown.com",
    date: details?.xposed_date
      ? `${details.xposed_date}-01-01`
      : new Date().toISOString().split("T")[0],
    description: `Tu email fue expuesto en la filtración de ${xonBreach}. ${
      details?.xposed_records
        ? `Afectó a ${details.xposed_records.toLocaleString("es-AR")} registros.`
        : ""
    }`,
    compromisedData,
    category,
  }
}

function calculateRiskScore(breaches: Breach[]): number {
  if (breaches.length === 0) return 0

  let score = 0

  for (const breach of breaches) {
    const hasPassword = breach.compromisedData.some(
      (d) => d.toLowerCase().includes("contraseña") || d.toLowerCase().includes("password")
    )
    const hasPersonalData = breach.compromisedData.some(
      (d) =>
        d.toLowerCase().includes("nombre") ||
        d.toLowerCase().includes("dirección") ||
        d.toLowerCase().includes("teléfono") ||
        d.toLowerCase().includes("dni")
    )
    const hasFinancialData = breach.compromisedData.some(
      (d) =>
        d.toLowerCase().includes("tarjeta") ||
        d.toLowerCase().includes("facturación") ||
        d.toLowerCase().includes("seguro social")
    )

    if (hasPassword) score += 25
    else if (hasPersonalData) score += 15
    else if (hasFinancialData) score += 20
    else score += 10
  }

  return Math.min(100, score)
}

export async function searchEmailXposedOrNot(email: string): Promise<SearchResult> {
  try {
    const response = await fetch(`${XON_API_BASE}/check-email/${encodeURIComponent(email)}`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (response.status === 404) {
      return {
        breaches: [],
        totalBreaches: 0,
        safeSites: SAFE_SITES.length,
        totalSites: SAFE_SITES.length,
        riskScore: 0,
      }
    }

    if (!response.ok) {
      throw new Error(`XposedOrNot API error: ${response.status}`)
    }

    const data: XposedOrNotResponse = await response.json()

    if (data.status !== "success" || !data.breaches || data.breaches.length === 0) {
      return {
        breaches: [],
        totalBreaches: 0,
        safeSites: SAFE_SITES.length,
        totalSites: SAFE_SITES.length,
        riskScore: 0,
      }
    }

    const breachNames = data.breaches.flat()
    const uniqueBreachNames = [...new Set(breachNames)]

    let analytics: XposedOrNotAnalyticsResponse | undefined
    try {
      const analyticsResponse = await fetch(
        `${XON_API_BASE}/breach-analytics?email=${encodeURIComponent(email)}`,
        { headers: { Accept: "application/json" } }
      )
      if (analyticsResponse.ok) {
        analytics = await analyticsResponse.json()
      }
    } catch {}

    const breaches: Breach[] = uniqueBreachNames.map((name) => mapXonDataToBreach(name, analytics))

    const riskScore = calculateRiskScore(breaches)

    return {
      breaches,
      totalBreaches: breaches.length,
      safeSites: SAFE_SITES.length,
      totalSites: breaches.length + SAFE_SITES.length,
      riskScore,
    }
  } catch (error) {
    console.error("XposedOrNot search failed:", error)
    throw error
  }
}
