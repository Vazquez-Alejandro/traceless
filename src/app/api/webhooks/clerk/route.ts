import { Webhook } from "svix"
import { headers } from "next/headers"
import { db } from "@/lib/db"

type WebhookEvent = {
  type: string
  data: Record<string, any>
}

export async function POST(req: Request) {
  const headerPayload = await headers()
  const svixId = headerPayload.get("svix-id")
  const svixTimestamp = headerPayload.get("svix-timestamp")
  const svixSignature = headerPayload.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing svix headers" }, { status: 400 })
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return Response.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(webhookSecret)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  if (event.type === "user.created") {
    const { id, email_addresses, first_name, last_name } = event.data
    const email = email_addresses?.[0]?.email_address ?? ""
    const name = [first_name, last_name].filter(Boolean).join(" ")

    const { error } = await db.from("users").upsert({
      id,
      email,
      name,
      plan: "free",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) console.error("Error creating user in Supabase:", error)
  }

  if (event.type === "user.updated") {
    const { id, email_addresses, first_name, last_name } = event.data
    const email = email_addresses?.[0]?.email_address ?? ""
    const name = [first_name, last_name].filter(Boolean).join(" ")

    await db
      .from("users")
      .update({ email, name, updated_at: new Date().toISOString() })
      .eq("id", id)
  }

  if (event.type === "user.deleted") {
    const { id } = event.data
    if (id) {
      await db.from("users").delete().eq("id", id)
    }
  }

  return Response.json({ success: true })
}
