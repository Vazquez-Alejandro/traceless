import { KNOWN_BREACHES, SAFE_SITES, type Breach, type SearchResult } from "@/data/breaches"

function hashInput(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function searchEmail(email: string): SearchResult {
  const normalized = email.toLowerCase().trim()
  const seed = hashInput(normalized)

  const matchedBreaches: Breach[] = []
  const totalBreaches = KNOWN_BREACHES.length

  for (let i = 0; i < KNOWN_BREACHES.length; i++) {
    const breachSeed = (seed * (i + 1) * 7 + 13) % 100
    if (breachSeed < 65) {
      matchedBreaches.push(KNOWN_BREACHES[i])
    }
  }

  const safeSitesMatch = (seed * 3) % 10
  const safeCount = Math.max(5, Math.min(SAFE_SITES.length, Math.floor(seed % 15) + safeSitesMatch + 3))

  const riskScore = Math.min(100, Math.round((matchedBreaches.length / totalBreaches) * 100) + 10)

  return {
    breaches: matchedBreaches,
    totalBreaches: matchedBreaches.length,
    safeSites: safeCount,
    totalSites: totalBreaches + safeCount,
    riskScore: Math.min(100, riskScore),
  }
}
