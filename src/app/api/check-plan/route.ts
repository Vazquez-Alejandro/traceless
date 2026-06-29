import { NextResponse } from "next/server"
import { getUserPlan, getSearchesCount, getLettersCount, ensureUser } from "@/lib/limits"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { PLANS } from "@/lib/stripe"

export async function GET() {
  let userId: string | null = null

  try {
    const { auth } = await import("@clerk/nextjs/server")
    const session = await auth()
    userId = session.userId
  } catch {
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 })
  }

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data: userRecord, error: lookupError } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle()

  if (lookupError) {
    console.error("Error looking up user:", lookupError)
  }

  if (!userRecord) {
    await ensureUser(userId, "usuario@email.com")
  }

  const plan = await getUserPlan(userId)
  const searchesUsed = await getSearchesCount(userId)
  const lettersUsed = await getLettersCount(userId)
  const planConfig = PLANS[plan]

  return NextResponse.json({
    plan,
    searchesUsed,
    searchesLimit: planConfig.searchesPerMonth === Infinity ? "∞" : planConfig.searchesPerMonth,
    lettersUsed,
    lettersLimit: planConfig.lettersPerMonth === Infinity ? "∞" : planConfig.lettersPerMonth,
    batchDeletion: planConfig.batchDeletion,
    monitoring: planConfig.monitoring,
    maxClients: planConfig.maxClients === Infinity ? "∞" : planConfig.maxClients,
  })
}
