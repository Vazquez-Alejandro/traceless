import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
  }

  const { Resend } = await import("resend")
  const resend = new Resend(apiKey)

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, name")
    .eq("subscription_status", "active")
    .in("plan", ["pro", "familia", "corporativo"])

  if (!users || users.length === 0) {
    return NextResponse.json({ message: "No users to monitor" })
  }

  let alertsSent = 0

  for (const user of users) {
    try {
      const response = await fetch(
        `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(user.email)}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.status === "success" && data.breaches && data.breaches.length > 0) {
          await resend.emails.send({
            from: "TraceLess <soporte@traceless.com.ar>",
            to: user.email,
            subject: "Alerta: Tus datos aparecieron en una nueva filtración",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">Alerta de seguridad</h2>
                <p>Hola ${user.name || "usuario"},</p>
                <p>Nuestro sistema de monitoreo detectó que tu email apareció en una nueva filtración de datos.</p>
                <p><strong>Filtraciones detectadas:</strong> ${data.breaches.flat().length}</p>
                <p>Te recomendamos:</p>
                <ol>
                  <li>Cambiar tus contraseñas inmediatamente</li>
                  <li>Revisar tu cuenta en busca de actividad sospechosa</li>
                  <li>Considerar activar la autenticación de dos factores</li>
                </ol>
                <p style="margin-top: 20px;">
                  <a href="https://traceless-gamma.vercel.app" style="background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver detalles en TraceLess</a>
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                  Este es un correo automático de TraceLess - Protección de identidad digital
                </p>
              </div>
            `,
          })
          alertsSent++
        }
      }
    } catch (error) {
      console.error(`Error monitoring user ${user.id}:`, error)
    }
  }

  return NextResponse.json({
    message: "Dark web monitoring completed",
    usersChecked: users.length,
    alertsSent,
  })
}
