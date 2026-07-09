import { db } from "@/lib/db"
import { searchBrokersReal } from "@/lib/broker-search"

interface VerificationResult {
  brokerId: string
  brokerName: string
  stillFound: boolean
  dataFound: string[]
  verifiedAt: string
  status: "verified_removed" | "still_present" | "error"
}

export async function verifyElimination(userId: string, email: string): Promise<VerificationResult[]> {
  // Get letters sent by this user
  const { data: letters } = await db
    .from("letters")
    .select("breach_id, created_at")
    .eq("user_id", userId)
    .eq("email", email)

  if (!letters || letters.length === 0) {
    return []
  }

  // Re-scrape brokers to check if data is still present
  const brokerResults = await searchBrokersReal(email)
  const results: VerificationResult[] = []

  for (const result of brokerResults) {
    const letterSent = letters.some((l: any) => l.breach_id === result.broker.id)

    if (letterSent) {
      results.push({
        brokerId: result.broker.id,
        brokerName: result.broker.name,
        stillFound: result.found,
        dataFound: result.dataFound,
        verifiedAt: new Date().toISOString(),
        status: result.found ? "still_present" : "verified_removed",
      })
    }
  }

  // Save verification results
  try {
    for (const r of results) {
      await db.from("elimination_verifications").upsert({
        user_id: userId,
        email,
        broker_id: r.brokerId,
        still_found: r.stillFound,
        data_found: r.dataFound,
        status: r.status,
        verified_at: r.verifiedAt,
      }, { onConflict: "user_id,email,broker_id" })
    }
  } catch {}

  return results
}

export async function getVerificationHistory(userId: string, email: string): Promise<VerificationResult[]> {
  const { data } = await db
    .from("elimination_verifications")
    .select("*")
    .eq("user_id", userId)
    .eq("email", email)
    .order("verified_at", { ascending: false })

  if (!data) return []

  return data.map((v: any) => ({
    brokerId: v.broker_id,
    brokerName: v.broker_id,
    stillFound: v.still_found,
    dataFound: v.data_found || [],
    verifiedAt: v.verified_at,
    status: v.status,
  }))
}
