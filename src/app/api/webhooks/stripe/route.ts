import { getStripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return Response.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const userId = session.metadata?.userId
      const plan = session.metadata?.plan || "premium"
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      if (userId && customerId) {
        await supabaseAdmin
          .from("users")
          .update({
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)
      }
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as unknown as Record<string, unknown>
      const status = sub.status as string

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, plan")
        .eq("stripe_subscription_id", sub.id as string)
        .single()

      if (user) {
        const currentPlan = user.plan || "premium"
        const plan = (status === "active" || status === "trialing") ? currentPlan : "free"
        const subStatus = status === "active" ? "active" : status === "past_due" ? "past_due" : "canceled"
        const periodEnd = (sub as Record<string, number>).current_period_end

        await supabaseAdmin
          .from("users")
          .update({
            plan,
            subscription_status: subStatus,
            period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
      }
      break
    }
  }

  return Response.json({ received: true })
}
