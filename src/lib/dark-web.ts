import { supabaseAdmin } from "@/lib/supabase-admin"

interface DarkWebResult {
  found: boolean
  sources: string[]
  riskLevel: "low" | "medium" | "high" | "critical"
  lastSeen: string | null
  details: string
}

// Check Have I Been Pwned (free API for breach checking)
async function checkHIBP(email: string): Promise<{ found: boolean; breaches: string[] }> {
  try {
    const response = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": process.env.HIBP_API_KEY || "",
          "User-Agent": "TraceLess-App",
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (response.status === 404) {
      return { found: false, breaches: [] }
    }

    if (!response.ok) {
      return { found: false, breaches: [] }
    }

    const data = await response.json()
    return {
      found: true,
      breaches: data.map((b: any) => b.Name),
    }
  } catch {
    return { found: false, breaches: [] }
  }
}

// Check paste sites (Have I Been Pwned paste API)
async function checkPastes(email: string): Promise<{ found: boolean; pasteCount: number }> {
  try {
    const response = await fetch(
      `https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          "hibp-api-key": process.env.HIBP_API_KEY || "",
          "User-Agent": "TraceLess-App",
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (response.status === 404) {
      return { found: false, pasteCount: 0 }
    }

    if (!response.ok) {
      return { found: false, pasteCount: 0 }
    }

    const data = await response.json()
    return {
      found: data.length > 0,
      pasteCount: data.length,
    }
  } catch {
    return { found: false, pasteCount: 0 }
  }
}

// Check XposedOrNot for dark web mentions
async function checkXONDarkWeb(email: string): Promise<{ found: boolean; details: string }> {
  try {
    const response = await fetch(
      `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (response.status === 404) {
      return { found: false, details: "" }
    }

    if (!response.ok) {
      return { found: false, details: "" }
    }

    const data = await response.json()

    if (data.status === "success" && data.breaches && data.breaches.length > 0) {
      return {
        found: true,
        details: `Encontrado en ${data.breaches.length} filtraciones conocidas`,
      }
    }

    return { found: false, details: "" }
  } catch {
    return { found: false, details: "" }
  }
}

export async function searchDarkWeb(email: string): Promise<DarkWebResult> {
  const sources: string[] = []
  let riskLevel: DarkWebResult["riskLevel"] = "low"
  let lastSeen: string | null = null
  const details: string[] = []

  // Check all sources in parallel
  const [hibp, pastes, xon] = await Promise.all([
    checkHIBP(email),
    checkPastes(email),
    checkXONDarkWeb(email),
  ])

  if (hibp.found) {
    sources.push("Have I Been Pwned")
    details.push(`Encontrado en ${hibp.breaches.length} filtraciones: ${hibp.breaches.slice(0, 3).join(", ")}`)
    riskLevel = hibp.breaches.length > 5 ? "critical" : hibp.breaches.length > 2 ? "high" : "medium"
  }

  if (pastes.found) {
    sources.push("Paste Sites")
    details.push(`Encontrado en ${pastes.pasteCount} pegatinas públicas`)
    riskLevel = "high"
  }

  if (xon.found) {
    sources.push("XposedOrNot")
    details.push(xon.details)
    if (riskLevel === "low") riskLevel = "medium"
  }

  return {
    found: sources.length > 0,
    sources,
    riskLevel,
    lastSeen,
    details: details.join(". "),
  }
}

export async function monitorUser(userId: string): Promise<DarkWebResult | null> {
  // Get user's email from Supabase
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("clerk_id", userId)
    .single()

  if (!user?.email) return null

  return searchDarkWeb(user.email)
}
