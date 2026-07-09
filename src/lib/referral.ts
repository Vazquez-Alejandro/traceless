import { db } from "./db"

export async function generateReferralCode(userId: string): Promise<string> {
  const code = `TL-${userId.slice(0, 8).toUpperCase()}`
  try {
    await db.from("users").update({ referral_code: code }).eq("id", userId)
  } catch {}
  return code
}

export async function getReferralCount(userId: string): Promise<number> {
  const { count, error } = await db
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", userId)

  if (error) return 0
  return count ?? 0
}

export async function applyReferralCode(userId: string, code: string): Promise<boolean> {
  const { data: referrer } = await db
    .from("users")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle()

  if (!referrer || referrer.id === userId) return false

  try {
    await db.from("referrals").insert({
      referrer_id: referrer.id,
      referred_id: userId,
      code,
      created_at: new Date().toISOString(),
    })
    return true
  } catch {
    return false
  }
}

export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number
  activeReferrals: number
  freeMonths: number
}> {
  const total = await getReferralCount(userId)

  const { data: active } = await db
    .from("referrals")
    .select("id")
    .eq("referrer_id", userId)

  const activeCount = active?.length ?? 0
  const freeMonths = Math.floor(activeCount / 2)

  return {
    totalReferrals: total,
    activeReferrals: activeCount,
    freeMonths,
  }
}
