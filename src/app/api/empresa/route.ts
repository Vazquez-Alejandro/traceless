import { NextResponse } from "next/server"
import { KNOWN_BREACHES } from "@/data/breaches"

function hashInput(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get("domain") || ""

  if (!domain || !domain.includes(".")) {
    return NextResponse.json({ error: "Ingresá un dominio válido (ej: empresa.com.ar)" }, { status: 400 })
  }

  const normalized = domain.toLowerCase().trim()
  const seed = hashInput(normalized)

  const matchedBreaches = KNOWN_BREACHES.filter((b) => {
    const breachDomain = b.domain.toLowerCase()
    const breachSeed = (seed * 7 + 13) % 100
    return breachSeed < 55 && breachDomain !== normalized
  })

  const employees = Math.max(5, (seed * 13) % 250 + 5)

  const riskScore = Math.min(100, Math.round((matchedBreaches.length / KNOWN_BREACHES.length) * 100) + 5)

  return NextResponse.json({
    domain: normalized,
    employees,
    breaches: matchedBreaches,
    totalBreaches: matchedBreaches.length,
    riskScore,
  })
}
