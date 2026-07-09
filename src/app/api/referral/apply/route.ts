import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { applyReferralCode } from "@/lib/referral"

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code) {
    return NextResponse.json({ error: "Código requerido" }, { status: 400 })
  }

  const success = await applyReferralCode(userId, code)

  if (!success) {
    return NextResponse.json({ error: "Código inválido o ya utilizado" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
