import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { canGenerateLetter } from "@/lib/limits"
import { KNOWN_BREACHES } from "@/data/breaches"

export async function GET() {
  let userId: string | null = null

  try {
    const { auth } = await import("@clerk/nextjs/server")
    const session = await auth()
    userId = session.userId
  } catch {
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 })
  }

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("letters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching letters:", error)
    return NextResponse.json({ error: "Error al cargar cartas" }, { status: 500 })
  }

  const lettersWithBreach = (data || []).map((letter) => {
    const breach = KNOWN_BREACHES.find((b) => b.id === letter.breach_id) || null
    return { ...letter, breach }
  })

  return NextResponse.json(lettersWithBreach)
}

export async function POST(req: Request) {
  let userId: string | null = null

  try {
    const { auth } = await import("@clerk/nextjs/server")
    const session = await auth()
    userId = session.userId
  } catch {
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 })
  }

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const allowed = await canGenerateLetter(userId)
  if (!allowed) {
    return NextResponse.json(
      { error: "Límite de cartas mensual alcanzado. Actualizá a Premium." },
      { status: 403 }
    )
  }

  const { breachId, email } = await req.json()
  if (!breachId || !email) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from("letters").insert({
    user_id: userId,
    breach_id: breachId,
    email,
  })

  if (error) {
    console.error("Error saving letter:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
