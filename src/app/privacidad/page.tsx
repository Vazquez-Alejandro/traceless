import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacidad - TraceLess",
  description: "Política de privacidad de TraceLess. Cómo manejamos tus datos.",
}

export default function PrivacidadPage() {
  return (
    <main className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-12">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest mb-4">/privacidad</p>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">Política de Privacidad</h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6 text-zinc-600 dark:text-zinc-400">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">1. Datos que recopilamos</h2>
            <p>TraceLess recopila únicamente los datos necesarios para funcionar:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Dirección de email que ingresás para escanear</li>
              <li>Información de tu cuenta (nombre, email) provista por Clerk al registrarte</li>
              <li>Registro de búsquedas y cartas generadas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">2. Cómo usamos tus datos</h2>
            <p>Usamos tu email únicamente para:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Buscar filtraciones en bases de datos públicas</li>
              <li>Generar cartas de baja personalizadas</li>
              <li>Enviarte alertas de monitoreo (si contratás Premium)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">3. Almacenamiento</h2>
            <p>Tus datos se almacenan en Supabase (PostgreSQL) con encriptación en tránsito y en reposo. No compartimos tus datos con terceros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">4. Tus derechos</h2>
            <p>Podés solicitar la eliminación de tus datos y cuenta en cualquier momento escribiéndonos. Tus búsquedas y cartas se eliminarán permanentemente.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">5. Cambios</h2>
            <p>Esta política puede actualizarse. Los cambios serán notificados en la aplicación.</p>
          </section>

          <p className="text-sm text-zinc-400 pt-4">Última actualización: junio 2026</p>
        </div>
      </div>
    </main>
  )
}
