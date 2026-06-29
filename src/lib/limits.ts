import { supabaseAdmin } from "./supabase-admin"
import { PLANS, type PlanType } from "./stripe"

export async function ensureUser(userId: string, email: string, name?: string) {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (!data) {
    await supabaseAdmin.from("users").insert({
      id: userId,
      email,
      name: name || email.split("@")[0],
      plan: "free",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

export async function getUserPlan(userId: string): Promise<PlanType> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("plan, subscription_status")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) return "free"

  if ((data.plan === "premium" || data.plan === "pro") && data.subscription_status === "active") {
    return data.plan as PlanType
  }

  return "free"
}

export async function getSearchesCount(userId: string): Promise<number> {
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await supabaseAdmin
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

  const { count, error } = await supabaseAdmin
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

export async function getMaxClients(userId: string): Promise<number> {
  const plan = await getUserPlan(userId)
  return PLANS[plan].maxClients
}
