import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

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

  const { email, name } = await req.json()

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId)
    .single()

  if (existing) {
    await supabaseAdmin
      .from("users")
      .update({ email, name, updated_at: new Date().toISOString() })
      .eq("id", userId)
  } else {
    await supabaseAdmin.from("users").insert({
      id: userId,
      email: email || "usuario@email.com",
      name: name || email?.split("@")[0] || "Usuario",
      plan: "free",
    })
  }

  return NextResponse.json({ success: true })
}
