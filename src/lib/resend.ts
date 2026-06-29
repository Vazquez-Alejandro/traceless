import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

export async function sendAlert(email: string, userName: string, newBreaches: string[]) {
  if (!resend) return

  const breachList = newBreaches.map((b) => `  • ${b}`).join("\n")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TraceLess <alertas@traceles.app>",
    to: email,
    subject: "🔴 Nueva filtración detectada - TraceLess",
    headers: {
      "List-Unsubscribe": `<${appUrl}/monitoreo>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `
      <h2>Hola ${userName},</h2>
      <p>Detectamos que tu email apareció en nuevas filtraciones desde tu último chequeo:</p>
      <pre>${breachList}</pre>
      <p>Visitá <a href="${appUrl}">TraceLess</a> para ver los detalles y generar cartas de baja.</p>
      <hr />
      <p style="color:#888;font-size:12px;">Si no querés recibir más alertas, <a href="${appUrl}/monitoreo">desactivá el monitoreo desde tu panel</a>.</p>
    `,
  })
}

export async function sendWeeklyReport(email: string, userName: string, breaches: string[], safeSites: number) {
  if (!resend) return

  const breachList = breaches.map((b) => `  • ${b}`).join("\n")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TraceLess <reportes@traceles.app>",
    to: email,
    subject: "📊 Reporte semanal - TraceLess",
    headers: {
      "List-Unsubscribe": `<${appUrl}/monitoreo>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `
      <h2>Tu reporte de privacidad semanal</h2>
      <p>Hola ${userName},</p>
      <p>Este es tu resumen semanal de exposición de datos:</p>
      <p>🔴 Filtraciones activas: ${breaches.length}</p>
      <p>🟢 Sitios seguros: ${safeSites}</p>
      ${breaches.length > 0 ? `<p>Filtraciones detectadas:</p><pre>${breachList}</pre>` : ""}
      <p>Visitá <a href="${appUrl}">TraceLess</a> para más detalles.</p>
      <hr />
      <p style="color:#888;font-size:12px;">Este es un reporte automático de TraceLess. Si no querés recibir más correos, <a href="${appUrl}/monitoreo">desuscribite</a>.</p>
    `,
  })
}
