import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getReferralStats } from "@/lib/referral"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const stats = await getReferralStats(userId)
  return NextResponse.json(stats)
}
