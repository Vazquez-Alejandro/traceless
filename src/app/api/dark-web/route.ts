import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { searchDarkWeb } from "@/lib/dark-web"
import { supabaseAdmin } from "@/lib/supabase-admin"

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

  const result = await searchDarkWeb(email)

  // Save monitoring result
  try {
    await supabaseAdmin.from("dark_web_monitors").upsert({
      user_id: userId,
      email,
      found: result.found,
      sources: result.sources,
      risk_level: result.riskLevel,
      details: result.details,
      checked_at: new Date().toISOString(),
    }, { onConflict: "user_id,email" })
  } catch {}

  return NextResponse.json(result)
}
