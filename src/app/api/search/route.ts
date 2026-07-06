import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { searchEmail } from "@/lib/search"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { canSearch } from "@/lib/limits"

export async function GET(request: NextRequest) {
  const { userId } = await auth()

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

  const allowed = await canSearch(userId)
  if (!allowed) {
    return NextResponse.json({ error: "Alcanzaste el límite de búsquedas de este mes. Actualizá a Premium para búsquedas ilimitadas." }, { status: 403 })
  }

  const result = await searchEmail(query)

  try {
    await supabaseAdmin.from("searches").insert({
      user_id: userId,
      email: query,
      result,
    })
  } catch {}

  try {
    const { data: letters } = await supabaseAdmin
      .from("letters")
      .select("breach_id, created_at")
      .eq("user_id", userId)
      .eq("email", query)

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
  } catch {}

  return NextResponse.json(result)
}
