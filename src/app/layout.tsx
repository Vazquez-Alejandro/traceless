import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import { ClerkProvider } from "@clerk/nextjs"
import HeaderAuth from "@/components/HeaderAuth"
import Logo from "@/components/Logo"
import { ToastProvider } from "@/components/Toast"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "TraceLess - ¿Dónde está expuesto tu email?",
  description:
    "Descubrí en qué filtraciones de datos apareció tu correo electrónico y generá cartas de baja para eliminar tu información personal.",
  icons: {
    icon: "/favicon.svg",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
          <ToastProvider>
          <header className="w-full header-accent">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <a href="/" className="flex items-center"><Logo /></a>
              <div className="flex items-center gap-4">
                <HeaderAuth />
              </div>
            </div>
          </header>
          {children}
          <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 py-8 mt-auto">
            <div className="max-w-5xl mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">TraceLess</span>
                  <span className="text-xs text-zinc-400">—</span>
                  <span className="text-xs text-zinc-400">Protegé tu privacidad digital</span>
                </div>
                <div className="flex items-center gap-6">
                  <Link href="/premium" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Planes</Link>
                  <Link href="/empresa" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Empresa</Link>
                  <Link href="/privacidad" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Privacidad</Link>
                  <Link href="/terminos" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Términos</Link>
                </div>
              </div>
              <p className="text-xs text-zinc-400 text-center md:text-left">
                TraceLess no almacena ni comparte direcciones de correo. Los datos de filtraciones provienen de fuentes públicas.
              </p>
            </div>
          </footer>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}


