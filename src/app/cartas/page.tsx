"use client"

import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import type { Breach } from "@/data/breaches"

interface Letter {
  id: string
  breach_id: string
  email: string
  created_at: string
  breach: Breach | null
}

function generateLetterHTML(query: string, breach: Breach, date: string): string {
  const d = new Date(date)
  const dateStr = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })

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
      Por medio de la presente, y en ejercicio de los derechos reconocidos en el
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
    <p style="color: #666;">${query}</p>
  </div>`
}

export default function CartasPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      router.push("/sign-in")
      return
    }

    fetch("/api/letters")
      .then((res) => res.json())
      .then((data) => {
        setLetters(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, isLoaded, router])

  const handlePrint = (letter: Letter) => {
    if (!letter.breach) return
    const html = generateLetterHTML(letter.email, letter.breach, letter.created_at)
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Carta de baja - ${letter.breach.name}</title></head><body>${html}</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  if (!isLoaded || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="flex-1 px-4">
      <div className="max-w-4xl mx-auto py-12">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/cartas</p>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Cartas de baja</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          {letters.length} carta{letters.length !== 1 ? "s" : ""} generada{letters.length !== 1 ? "s" : ""}
        </p>

        {letters.length === 0 ? (
          <div className="text-center py-16 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">No generaste ninguna carta todavía.</p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg"
            >
              Buscar datos
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map((letter) => (
              <div
                key={letter.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {letter.breach?.name || letter.breach_id}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {letter.email} · {new Date(letter.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-zinc-400 transition-transform ${expandedId === letter.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedId === letter.id && letter.breach && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div
                      ref={printRef}
                      className="p-6"
                      dangerouslySetInnerHTML={{
                        __html: generateLetterHTML(letter.email, letter.breach, letter.created_at),
                      }}
                    />
                    <div className="px-6 pb-6 flex gap-3">
                      <button
                        onClick={() => handlePrint(letter)}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir / Guardar PDF
                      </button>
                      {letter.breach.deletionUrl && (
                        <a
                          href={letter.breach.deletionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          Ir al sitio de {letter.breach.name}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
