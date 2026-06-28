import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

export async function sendAlert(email: string, userName: string, newBreaches: string[]) {
  if (!resend) return

  const breachList = newBreaches.map((b) => `  • ${b}`).join("\n")

  await resend.emails.send({
    from: "TraceLess <alertas@tudominio.com>",
    to: email,
    subject: "🔴 Nueva filtración detectada - TraceLess",
    html: `
      <h2>Hola ${userName},</h2>
      <p>Detectamos que tu email apareció en nuevas filtraciones desde tu último chequeo:</p>
      <pre>${breachList}</pre>
      <p>Visitá <a href="${process.env.NEXT_PUBLIC_APP_URL}">TraceLess</a> para ver los detalles y generar cartas de baja.</p>
      <hr />
      <p style="color:#888;font-size:12px;">Si no querés recibir más alertas, desactivá el monitoreo desde tu panel.</p>
    `,
  })
}

export async function sendWeeklyReport(email: string, userName: string, breaches: string[], safeSites: number) {
  if (!resend) return

  const breachList = breaches.map((b) => `  • ${b}`).join("\n")

  await resend.emails.send({
    from: "TraceLess <reportes@tudominio.com>",
    to: email,
    subject: "📊 Reporte semanal - TraceLess",
    html: `
      <h2>Tu reporte de privacidad semanal</h2>
      <p>Hola ${userName},</p>
      <p>Este es tu resumen semanal de exposición de datos:</p>
      <p>🔴 Filtraciones activas: ${breaches.length}</p>
      <p>🟢 Sitios seguros: ${safeSites}</p>
      ${breaches.length > 0 ? `<p>Filtraciones detectadas:</p><pre>${breachList}</pre>` : ""}
      <p>Visitá <a href="${process.env.NEXT_PUBLIC_APP_URL}">TraceLess</a> para más detalles.</p>
      <hr />
      <p style="color:#888;font-size:12px;">Este es un reporte automático de TraceLess.</p>
    `,
  })
}
