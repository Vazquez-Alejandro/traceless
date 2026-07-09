import { db } from "./db"
import { PLANS, type PlanType } from "./lemonsqueezy"

export async function ensureUser(userId: string, email: string, name?: string) {
  try {
    const { data } = await db
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (!data) {
      await db.from("users").insert({
        id: userId,
        email,
        name: name || email.split("@")[0],
        plan: "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  } catch {
    // DB not available — app works with free defaults
  }
}

export async function getUserPlan(userId: string): Promise<PlanType> {
  const { data, error } = await db
    .from("users")
    .select("plan, subscription_status")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) return "free"

  const validPlans = ["basico", "pro", "familia", "corporativo", "premium"]
  if (validPlans.includes(data.plan) && data.subscription_status === "active") {
    if (data.plan === "premium") return "basico"
    return data.plan as PlanType
  }

  return "free"
}

export async function getSearchesCount(userId: string): Promise<number> {
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await db
    .from("searches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", firstOfMonth.toISOString())

  if (error) return 0
  return count ?? 0
}

export async function getLettersCount(userId: string): Promise<number> {
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await db
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", firstOfMonth.toISOString())

  if (error) return 0
  return count ?? 0
}

export async function canSearch(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].searchesPerMonth === Infinity || (await getSearchesCount(userId)) < PLANS[plan].searchesPerMonth
}

export async function canGenerateLetter(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].lettersPerMonth === Infinity || (await getLettersCount(userId)) < PLANS[plan].lettersPerMonth
}

export async function canUseBatchDeletion(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].batchDeletion
}

export async function canUseMonitoring(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].monitoring
}

export async function canUseDarkWebMonitoring(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].darkWebMonitoring
}

export async function getMaxClients(userId: string): Promise<number> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].maxClients
}

export async function getFamilyMembers(userId: string): Promise<number> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].familyMembers
}

export async function getCorporateSeats(userId: string): Promise<number> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].corporateSeats
}

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
