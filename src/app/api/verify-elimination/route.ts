import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { verifyElimination, getVerificationHistory } from "@/lib/elimination-verify"

export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get("email")

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  const history = await getVerificationHistory(userId, email)
  return NextResponse.json({ history })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const { email } = body

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  const results = await verifyElimination(userId, email)
  return NextResponse.json({ results })
}
