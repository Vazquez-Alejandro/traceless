import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { canUseMonitoring } from "@/lib/limits"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("broker_monitoring")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching broker monitoring:", error)
    return NextResponse.json({ error: "Error al cargar monitoreo" }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function DELETE(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("broker_monitoring")
    .update({ active: false })
    .eq("id", id)
    .eq("user_id", userId)

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
      { error: "Monitoreo disponible solo en planes Básico y Pro." },
      { status: 403 }
    )
  }

  const { dni } = await req.json()
  if (!dni) {
    return NextResponse.json({ error: "DNI requerido" }, { status: 400 })
  }

  const brokers = ["dateas", "datacels", "busca-datos", "buscadatos"]
  const inserts = brokers.map(broker => ({
    user_id: userId,
    broker,
    dni,
    active: true,
    status: "pending" as const,
    next_check_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }))

  const { error } = await supabaseAdmin.from("broker_monitoring").insert(inserts)

  if (error) {
    console.error("Error subscribing to broker monitoring:", error)
    return NextResponse.json({ error: "Error al activar monitoreo" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
