import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { searchEmail } from "@/lib/search"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Ingresá un email" }, { status: 400 })
  }

  if (!query.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  // Check plan limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, searches_used, searches_limit, letters_used, letters_limit, batch_deletion, monitoring")
    .eq("id", userId)
    .single()

  if (profile) {
    const limit = profile.searches_limit === -1 ? Infinity : profile.searches_limit
    if (profile.searches_used >= limit) {
      return NextResponse.json({ error: `Alcanzaste el límite de ${profile.searches_used} búsquedas de este mes. Actualizá a Premium para búsquedas ilimitadas.` }, { status: 403 })
    }

    await supabase.from("profiles").update({ searches_used: profile.searches_used + 1 }).eq("id", userId)
  }

  const result = searchEmail(query)

  // Attach letter status for each breach
  const { data: letters } = await supabase
    .from("letters")
    .select("breach_id, created_at")
    .eq("user_id", userId)
    .eq("target_email", query)

  const letterMap = new Map<string, string>()
  if (letters) {
    for (const l of letters) {
      letterMap.set(l.breach_id, l.created_at)
    }
  }

  result.breaches = result.breaches.map((b) => ({
    ...b,
    hasLetter: letterMap.has(b.id),
    letterCreatedAt: letterMap.get(b.id) || undefined,
  }))

  return NextResponse.json(result)
}
