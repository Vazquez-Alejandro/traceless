"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface ToastMessage {
  id: number
  text: string
  type: "success" | "error" | "info"
}

interface ToastContextType {
  toast: (text: string, type?: "success" | "error" | "info") => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in-up ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : t.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-white dark:bg-zinc-700"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
