"use client"

import { useState, type FormEvent } from "react"

interface SearchFormProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    onSearch(query.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className={`relative p-1 rounded-2xl transition-all duration-300 ${focused ? "bg-gradient-to-r from-amber-500 via-slate-300 to-amber-500" : "bg-transparent"}`}>
        <div className="relative bg-zinc-900 rounded-xl p-1">
          <div className="flex flex-col sm:flex-row gap-3 p-2">
            <div className="flex-1 relative">
              <input
                type="email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="tu@email.com"
                className="w-full px-5 py-4 text-base rounded-xl bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.includes("@")}
              className="px-8 py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-xl transition-all text-base flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Escaneando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
