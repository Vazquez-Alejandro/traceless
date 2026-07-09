import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { email, name } = await req.json()

  try {
    const { data: existing } = await db
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (existing) {
      await db
        .from("users")
        .update({ email, name, updated_at: new Date().toISOString() })
        .eq("id", userId)
    } else if (email) {
      await db.from("users").insert({
        id: userId,
        email,
        name: name || email.split("@")[0] || "Usuario",
        plan: "free",
      })
    }
  } catch {
    console.error("DB unavailable, skipping sync")
  }

  return NextResponse.json({ success: true })
}
