import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      name,
      cuit,
      industry,
      employeeCount,
      dataTypes,
      hasDPO,
      dpoName,
      dpoEmail,
      privacyPolicyUrl,
      website,
    } = body

    if (!name || !cuit || !industry) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("user_id", userId)
      .single()

    let result
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("companies")
        .update({
          name,
          cuit,
          industry,
          employee_count: employeeCount,
          data_types: dataTypes,
          has_dpo: hasDPO,
          dpo_name: dpoName,
          dpo_email: dpoEmail,
          privacy_policy_url: privacyPolicyUrl,
          website,
        })
        .eq("user_id", userId)
        .select()
        .single()
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from("companies")
        .insert({
          user_id: userId,
          name,
          cuit,
          industry,
          employee_count: employeeCount,
          data_types: dataTypes,
          has_dpo: hasDPO,
          dpo_name: dpoName,
          dpo_email: dpoEmail,
          privacy_policy_url: privacyPolicyUrl,
          website,
        })
        .select()
        .single()
      result = data
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Error al guardar empresa" }, { status: 500 })
  }
}
