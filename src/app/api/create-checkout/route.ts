import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { PLANS, createCheckout } from "@/lib/lemonsqueezy"

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const planKey = (body.plan as keyof typeof PLANS) || "basico"

  if (!PLANS[planKey]) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const variantId = PLANS[planKey].variantId
  if (!variantId) {
    return NextResponse.json({ error: "Variante no configurada para este plan" }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  try {
    const checkoutUrl = await createCheckout(variantId, {
      userId,
      plan: planKey,
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error("Error creating Lemon Squeezy checkout:", error)
    return NextResponse.json({ error: "Error al crear el checkout" }, { status: 500 })
  }
}
