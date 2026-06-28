interface LogoProps {
  showText?: boolean
  className?: string
  iconOnly?: boolean
}

export default function Logo({ showText = true, className = "", iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={iconOnly ? 32 : 32}
        height={iconOnly ? 32 : 32}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="logo-gold" x1="0" y1="0" x2="28" y2="28">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="logo-silver" x1="0" y1="14" x2="28" y2="14">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
        <circle cx="14" cy="14" r="13" stroke="url(#logo-gold)" strokeWidth="1.5" />
        <path
          d="M14 6C10.5 6 8 7.5 8 11.5C8 15.5 12 19 14 21C16 19 20 15.5 20 11.5C20 7.5 17.5 6 14 6Z"
          fill="url(#logo-silver)"
          fillOpacity="0.15"
          stroke="url(#logo-gold)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M11 13.5L13 15.5L17 11"
          stroke="url(#logo-gold)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && !iconOnly && (
        <span className="font-bold text-xl tracking-tight text-amber-600 dark:text-amber-400">
          TraceLess
        </span>
      )}
    </div>
  )
}
