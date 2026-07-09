import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { db } from "@/lib/db"

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  const hmac = crypto.createHmac("sha256", secret)
  const digest = Buffer.from(hmac.update(body).digest("hex"), "utf8")
  const sig = Buffer.from(signature, "utf8")
  return crypto.timingSafeEqual(digest, sig)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("x-signature")
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 })
  }

  if (!verifyWebhookSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const eventName = payload.meta?.event_name
  const data = payload.data

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        const attrs = data.attributes
        const userId = data.attributes.custom_data?.userId
        const plan = data.attributes.custom_data?.plan || "basico"
        const status = attrs.status

        if (userId) {
          await db
            .from("users")
            .update({
              plan,
              subscription_status: status === "active" ? "active" : status === "past_due" ? "past_due" : "canceled",
              lemonsqueezy_customer_id: attrs.customer_id?.toString(),
              lemonsqueezy_subscription_id: attrs.id?.toString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId)
        }
        break
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        const attrs = data.attributes
        const { data: user } = await db
          .from("users")
          .select("id")
          .eq("lemonsqueezy_subscription_id", attrs.id?.toString())
          .single()

        if (user) {
          await db
            .from("users")
            .update({
              plan: "free",
              subscription_status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)
        }
        break
      }

      case "order_created": {
        const attrs = data.attributes
        const userId = attrs.custom_data?.userId
        const plan = attrs.custom_data?.plan || "basico"

        if (userId && attrs.status === "paid") {
          await db
            .from("users")
            .update({
              plan,
              subscription_status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId)
        }
        break
      }
    }
  } catch (error) {
    console.error("Webhook error:", error)
  }

  return NextResponse.json({ received: true })
}
