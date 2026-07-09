import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { searchBrokersReal } from "@/lib/broker-search"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { canSearch } from "@/lib/limits"

export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ error: "Ingresá un DNI, nombre o email válido" }, { status: 400 })
  }

  const allowed = await canSearch(userId)
  if (!allowed) {
    return NextResponse.json({ error: "Alcanzaste el límite de búsquedas de este mes. Actualizá al plan Básico para búsquedas ilimitadas." }, { status: 403 })
  }

  const results = await searchBrokersReal(query.trim())

  try {
    await supabaseAdmin.from("searches").insert({
      user_id: userId,
      email: query.trim(),
      result: { brokerResults: results },
    })
  } catch {}

  return NextResponse.json({ results })
}
