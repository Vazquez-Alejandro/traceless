import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("compliance")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error || !data) {
      return NextResponse.json({
        score: 0,
        answers: {},
        lastUpdated: null,
        companyName: "",
        industry: "",
      })
    }

    return NextResponse.json({
      score: data.score,
      answers: data.answers,
      lastUpdated: data.last_updated,
      companyName: data.company_name || "",
      industry: data.industry || "",
    })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { answers, score } = body

    const { data: existing } = await supabaseAdmin
      .from("compliance")
      .select("id")
      .eq("user_id", userId)
      .single()

    let result
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("compliance")
        .update({
          answers,
          score,
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single()
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from("compliance")
        .insert({
          user_id: userId,
          answers,
          score,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single()
      result = data
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}
