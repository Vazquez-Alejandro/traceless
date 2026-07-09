import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { canUseMonitoring } from "@/lib/limits"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data, error } = await db
    .from("monitoring")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching monitoring:", error)
    return NextResponse.json({ error: "Error al cargar monitoreo" }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function DELETE(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 })
  }

  const { error } = await db
    .from("monitoring")
    .update({ active: false })
    .eq("user_id", userId)
    .eq("email", email)

  if (error) {
    console.error("Error unsubscribing:", error)
    return NextResponse.json({ error: "Error al desuscribir" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const allowed = await canUseMonitoring(userId)
  if (!allowed) {
    return NextResponse.json(
      { error: "Monitoreo disponible solo en Premium." },
      { status: 403 }
    )
  }

  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 })
  }

  const { error } = await db.from("monitoring").upsert({
    user_id: userId,
    email,
    active: true,
    next_check_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (error) {
    console.error("Error subscribing to monitoring:", error)
    return NextResponse.json({ error: "Error al activar monitoreo" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
