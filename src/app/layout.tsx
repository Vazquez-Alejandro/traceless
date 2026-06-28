import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import HeaderAuth from "@/components/HeaderAuth"
import Logo from "@/components/Logo"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
          <header className="w-full header-accent">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <a href="/" className="flex items-center"><Logo /></a>
              <div className="flex items-center gap-4">
                <HeaderAuth />
              </div>
            </div>
          </header>
          {children}
          <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 py-6 mt-auto">
            <div className="max-w-5xl mx-auto px-4 text-center text-sm text-zinc-400">
              TraceLess no almacena ni comparte direcciones de correo. Los datos de filtraciones provienen de fuentes públicas.
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  )
}


