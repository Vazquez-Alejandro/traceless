import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { email, name } = await req.json()

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (lookupError) {
    console.error("Error looking up user:", lookupError)
  }

  if (existing) {
    await supabaseAdmin
      .from("users")
      .update({ email, name, updated_at: new Date().toISOString() })
      .eq("id", userId)
  } else if (email) {
    await supabaseAdmin.from("users").insert({
      id: userId,
      email,
      name: name || email.split("@")[0] || "Usuario",
      plan: "free",
    })
  }

  return NextResponse.json({ success: true })
}
