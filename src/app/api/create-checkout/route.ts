import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { PLANS } from "@/lib/stripe"

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const planKey = (body.plan as keyof typeof PLANS) || "premium"

  if (!PLANS[planKey]) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const priceId = PLANS[planKey].priceId
  if (!priceId) {
    return NextResponse.json({ error: "Precio no configurado para este plan" }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const { getStripe } = await import("@/lib/stripe")

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, plan: planKey },
    success_url: `${appUrl}/?success=true`,
    cancel_url: `${appUrl}/premium?canceled=true`,
  })

  return NextResponse.json({ url: session.url })
}
