import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos y condiciones - TraceLess",
  description: "Términos y condiciones de uso de TraceLess.",
}

export default function TerminosPage() {
  return (
    <main className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-12">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/terminos</p>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">Términos y Condiciones</h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6 text-zinc-600 dark:text-zinc-400">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">1. Servicio</h2>
            <p>TraceLess es una herramienta de escaneo de filtraciones de datos. Los resultados se basan en bases de datos públicas y pueden no ser exhaustivos. No garantizamos la detección de todas las filtraciones existentes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">2. Uso responsable</h2>
            <p>El usuario se compromete a usar TraceLess únicamente para escanear sus propias direcciones de email o las de sus clientes con autorización explícita.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">3. Suscripciones</h2>
            <p>Los planes Premium y Pro se facturan mensualmente vía Stripe. Podés cancelar en cualquier momento. El acceso a funciones Premium se mantiene hasta el final del período facturado.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">4. Limitación de responsabilidad</h2>
            <p>TraceLess no se responsabiliza por el uso indebido de las cartas de baja generadas ni por la efectividad de las solicitudes de eliminación enviadas a terceros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">5. Modificaciones</h2>
            <p>Nos reservamos el derecho de modificar estos términos. Los cambios serán comunicados a los usuarios registrados.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
