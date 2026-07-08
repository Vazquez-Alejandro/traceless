import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserPlan, getSearchesCount, getLettersCount, ensureUser } from "@/lib/limits"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { PLANS } from "@/lib/lemonsqueezy"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  try {
    const { data: userRecord } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .maybeSingle()

    if (!userRecord) {
      await ensureUser(userId, "usuario@email.com")
    }
  } catch {
    console.error("DB unavailable, defaulting to free")
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
