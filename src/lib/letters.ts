import type { Breach } from "@/data/breaches"

export const PROFILE_KEY = "traceless_profile"

export interface UserProfile {
  name: string
  address?: string
  dni?: string
}

export function generateDeletionLetter(query: string, breach: Breach, profile?: UserProfile): string {
  const date = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const fullName = profile?.name || "[TU NOMBRE COMPLETO]"
  const addressLine = profile?.address || "[Dirección (opcional)]"
  const dniLine = profile?.dni || "[DNI/Pasaporte (opcional)]"

  return `Asunto: Solicitud de eliminación de datos personales - RGPD/LOPDGDD

${date}

A quien corresponda,
${breach.name}
${breach.domain}

Por medio de la presente, yo ${fullName}, usuario de ${breach.name} con el correo electrónico ${query}, ejerzo mi derecho de supresión (derecho al olvido) según lo establecido en:

- Artículo 17 del Reglamento General de Protección de Datos (RGPD) de la Unión Europea
- Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)
- Artículos aplicables de la Ley 25.326 de Protección de Datos Personales de Argentina o legislación local vigente

Fundamentos de la solicitud:

1. Mis datos personales fueron expuestos en la filtración de seguridad ocurrida en ${breach.date || "una fecha anterior"}, según registros públicos.
2. Como consecuencia, ${breach.description}
3. Los datos comprometidos incluyen: ${breach.compromisedData.join(", ")}.

Por los motivos expuestos, solicito formalmente:

- La eliminación completa de todos mis datos personales asociados a ${query} de sus sistemas y bases de datos.
- La confirmación por escrito de que dicha eliminación se ha llevado a cabo.
- La información sobre los plazos estimados para la eliminación completa.

Quedo a la espera de su confirmación en un plazo máximo de 30 días hábiles, según lo establece la normativa vigente.

Sin otro particular, saludo atte.

${fullName}
${query}
${addressLine}
${dniLine}

---
Este mensaje fue generado automáticamente por TraceLess.`
}

export function generateDeletionLetterHTML(query: string, breach: Breach, date: string, profile?: UserProfile): string {
  const d = new Date(date)
  const dateStr = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
  const fullName = profile?.name || "[TU NOMBRE COMPLETO]"
  const addressLine = profile?.address ? `<br />${profile.address}` : ""
  const dniLine = profile?.dni ? `<br />${profile.dni}` : ""

  return `<div style="font-family: 'Georgia', serif; max-width: 700px; margin: 0 auto; padding: 60px 40px; color: #111;">
    <p style="text-align: right; color: #666; font-size: 14px; margin-bottom: 40px;">${dateStr}</p>

    <p style="margin-bottom: 30px;">
      <strong>${breach.name}</strong><br />
      Att: Departamento de Privacidad / Protección de Datos<br />
      ${breach.domain}
    </p>

    <p style="margin-bottom: 20px;"><strong>Ref: Solicitud de eliminación de datos personales</strong></p>

    <p style="margin-bottom: 15px;">Estimados,</p>

    <p style="margin-bottom: 15px; line-height: 1.6;">
      Por medio de la presente, yo <strong>${fullName}</strong>, en ejercicio de los derechos reconocidos en el
      <strong>Reglamento General de Protección de Datos (RGPD) de la Unión Europea</strong>
      y la <strong>Ley de Protección de Datos Personales (LOPDGDD) de España</strong>,
      solicito formalmente la <strong>eliminación inmediata</strong> de todos mis datos personales
      asociados a la dirección de correo electrónico <strong>${query}</strong>
      de sus sistemas y bases de datos.
    </p>

    <p style="margin-bottom: 15px; line-height: 1.6;">
      Esta solicitud se realiza en el contexto de la filtración de datos ocurrida en
      <strong>${breach.name}</strong> en fecha <strong>${breach.date}</strong>,
      en la que se vieron comprometidos los siguientes datos:
      <strong>${breach.compromisedData.join(", ")}</strong>.
    </p>

    <p style="margin-bottom: 15px; line-height: 1.6;">
      De acuerdo con el Artículo 17 del RGPD (derecho al olvido) y el Artículo 16 de la LOPDGDD,
      solicito que:
    </p>

    <ol style="margin-bottom: 20px; line-height: 1.6;">
      <li>Se eliminen todos mis datos personales de sus sistemas.</li>
      <li>Se interrumpa cualquier tratamiento de mis datos.</li>
      <li>Se notifique a terceros que hayan recibido mis datos sobre mi solicitud de eliminación.</li>
    </ol>

    <p style="margin-bottom: 15px; line-height: 1.6;">
      Agradeceré confirmación por escrito de que mis datos han sido eliminados en un plazo máximo
      de 30 días, según lo establecido por la normativa vigente.
    </p>

    <p style="margin-bottom: 40px; line-height: 1.6;">
      Quedo a la espera de su pronta respuesta.
    </p>

    <p style="margin-bottom: 5px;">Atentamente,</p>
    <p>
      <strong>${fullName}</strong><br />
      ${query}${addressLine}${dniLine}
    </p>
  </div>`
}

export function generateMasterDeletionLetter(emails: string[], profile?: UserProfile): string {
  const date = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const fullName = profile?.name || "[TU NOMBRE COMPLETO]"
  const contactEmail = emails[0] || "[Correo de contacto]"
  const addressLine = profile?.address ? `\n${profile.address}` : "\n[Dirección (opcional)]"

  const emailList = emails.map((e) => `  - ${e}`).join("\n")

  return `Asunto: Solicitud de eliminación de datos personales - RGPD/LOPDGDD

${date}

Estimados señores:

Por medio de la presente, yo ${fullName}, solicito la eliminación completa de mis datos personales asociados a las siguientes direcciones de correo electrónico:

${emailList}

Esta solicitud se realiza en virtud del derecho de supresión (derecho al olvido) establecido en el Artículo 17 del Reglamento General de Protección de Datos (RGPD) y la legislación aplicable local.

Agradeceré confirmación escrita de la eliminación en un plazo máximo de 30 días hábiles.

Sin otro particular, saludo atte.

${fullName}
${contactEmail}${addressLine}

---
Este mensaje fue generado automáticamente por TraceLess.`
}
