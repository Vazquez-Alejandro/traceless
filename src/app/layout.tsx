import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@vercel/analytics/react"
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
  title: {
    default: "TraceLess - Protección de Datos Personales Argentina | Ley 25.326",
    template: "%s | TraceLess",
  },
  description:
    "Herramienta gratuita para verificar si tu email apareció en filtraciones de datos. Generá cartas Habeas Data bajo la Ley 25.326 para solicitar la eliminación de tus datos personales. Monitoreo de dark web y cumplimiento de normativa argentina.",
  keywords: [
    "protección de datos",
    "Ley 25.326",
    "Habeas Data",
    "filtraciones de datos",
    "privacidad",
    "email expuesto",
    "dark web",
    "datos personales",
    "Argentina",
    "cumplimiento normativo",
    "RGPD",
    "brote de datos",
    "filtración",
    "seguridad informática",
  ],
  authors: [{ name: "TraceLess" }],
  creator: "TraceLess",
  metadataBase: new URL("https://www.traceless.com.ar"),
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://www.traceless.com.ar",
    siteName: "TraceLess",
    title: "TraceLess - ¿Dónde está expuesto tu email? Protección de Datos Argentina",
    description:
      "Verificá si tu email apareció en filtraciones de datos. Generá cartas Habeas Data y monitoreá tu privacidad gratis.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TraceLess - Protección de Datos Personales",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TraceLess - Protección de Datos Personales Argentina",
    description:
      "Verificá si tu email apareció en filtraciones de datos y generá cartas Habeas Data gratis.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.traceless.com.ar",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "TraceLess",
              url: "https://www.traceless.com.ar",
              description:
                "Herramienta gratuita para verificar si tu email apareció en filtraciones de datos. Generá cartas Habeas Data bajo la Ley 25.326.",
              applicationCategory: "SecurityApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "ARS",
              },
              author: {
                "@type": "Organization",
                name: "TraceLess",
                url: "https://www.traceless.com.ar",
              },
              inLanguage: "es-AR",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://www.traceless.com.ar?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
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
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}


