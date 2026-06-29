import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-zinc-200 dark:text-zinc-800 mb-4">404</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Página no encontrada
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
