import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data: searches, error: searchError } = await supabaseAdmin
    .from("searches")
    .select("id, email, result, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (searchError) {
    console.error("Error fetching history:", searchError)
    return NextResponse.json({ error: "Error al cargar historial" }, { status: 500 })
  }

  const { data: letters, error: letterError } = await supabaseAdmin
    .from("letters")
    .select("id, breach_id, email, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (letterError) {
    console.error("Error fetching letters:", letterError)
    return NextResponse.json({ error: "Error al cargar cartas" }, { status: 500 })
  }

  const lettersByEmail: Record<string, typeof letters> = {}
  for (const letter of letters || []) {
    const key = letter.email
    if (!lettersByEmail[key]) lettersByEmail[key] = []
    lettersByEmail[key].push(letter)
  }

  const history = (searches || []).map((search) => {
    const searchLetters = lettersByEmail[search.email] || []
    const letteredBreachIds = new Set(searchLetters.map((l) => l.breach_id))
    const breaches = (search.result as any)?.breaches || []
    const breachesWithLetters = breaches.map((b: any) => ({
      ...b,
      hasLetter: letteredBreachIds.has(b.id),
    }))

    return {
      id: search.id,
      email: search.email,
      created_at: search.created_at,
      totalBreaches: (search.result as any)?.totalBreaches || 0,
      riskScore: (search.result as any)?.riskScore || 0,
      breaches: breachesWithLetters,
      lettersCount: searchLetters.length,
      letters: searchLetters,
    }
  })

  return NextResponse.json(history)
}
