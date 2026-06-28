import type { Breach } from "@/data/breaches"

export function generateDeletionLetter(query: string, breach: Breach): string {
  const date = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `Asunto: Solicitud de eliminación de datos personales - RGPD/LOPDGDD

${date}

A quien corresponda,
${breach.name}
${breach.domain}

Por medio de la presente, yo [TU NOMBRE COMPLETO], usuario de ${breach.name} con el correo electrónico ${query}, ejerzo mi derecho de supresión (derecho al olvido) según lo establecido en:

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

[TU NOMBRE COMPLETO]
${query}
[Dirección (opcional)]
[DNI/Pasaporte (opcional)]

---
Este mensaje fue generado automáticamente por TraceLess.`
}

export function generateMasterDeletionLetter(emails: string[]): string {
  const date = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const emailList = emails.map((e) => `  - ${e}`).join("\n")

  return `Asunto: Solicitud de eliminación de datos personales - RGPD/LOPDGDD

${date}

Estimados señores:

Por medio de la presente, solicito la eliminación completa de mis datos personales asociados a las siguientes direcciones de correo electrónico:

${emailList}

Esta solicitud se realiza en virtud del derecho de supresión (derecho al olvido) establecido en el Artículo 17 del Reglamento General de Protección de Datos (RGPD) y la legislación aplicable local.

Agradeceré confirmación escrita de la eliminación en un plazo máximo de 30 días hábiles.

Sin otro particular, saludo atte.

[TU NOMBRE COMPLETO]
[Correo de contacto]
[Dirección (opcional)]

---
Este mensaje fue generado automáticamente por TraceLess.`
}
