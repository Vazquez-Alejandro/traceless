import { supabaseAdmin } from "@/lib/supabase-admin"
import { searchEmail } from "@/lib/search"
import { sendWeeklyReport } from "@/lib/resend"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  if (process.env.CRON_SECRET && process.env.CRON_SECRET !== "") {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  const now = new Date().toISOString()

  const { data: subscriptions } = await supabaseAdmin
    .from("monitoring")
    .select("*, users(email, name)")
    .eq("active", true)
    .lte("next_check_at", now)

  if (!subscriptions || subscriptions.length === 0) {
    return Response.json({ checked: 0 })
  }

  let checked = 0
  for (const sub of subscriptions) {
    try {
      const result = searchEmail(sub.email)
      const breachNames = result.breaches.map((b: { name: string }) => b.name)

      await sendWeeklyReport(
        sub.users?.email || sub.email,
        sub.users?.name || "usuario",
        breachNames,
        result.safeSites,
      )

      await supabaseAdmin
        .from("monitoring")
        .update({
          last_checked_at: now,
          next_check_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", sub.id)

      checked++
    } catch (error) {
      console.error(`Error checking monitoring for ${sub.id}:`, error)
    }
  }

  return Response.json({ checked })
}
