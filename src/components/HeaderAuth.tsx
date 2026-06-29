"use client"

import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import Link from "next/link"

export default function HeaderAuth() {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return <div className="w-20 h-8 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-5">
        <Link href="/clientes" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium transition-colors">
          Clientes
        </Link>
        <Link href="/historial" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium transition-colors">
          Historial
        </Link>
        <Link href="/cartas" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium transition-colors">
          Cartas
        </Link>
        <Link href="/monitoreo" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium transition-colors">
          Monitoreo
        </Link>
        <Link href="/empresa" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium transition-colors">
          Empresa
        </Link>
        <Link href="/configuracion" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium transition-colors">
          Config
        </Link>
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton mode="modal">
        <button className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium">
          Iniciar sesión
        </button>
      </SignInButton>
      <Link
        href="/sign-up"
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Registrarse
      </Link>
    </div>
  )
}
