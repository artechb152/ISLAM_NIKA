/* Line-art icons for the Ramadan timeline medallions and the fast-day arch cards.
   All inherit currentColor and share a 24×24 stroke grid so they sit consistently. */

type P = { className?: string }
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconCrescent({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M20.5 14.8A8.5 8.5 0 1 1 10 4.2a6.7 6.7 0 0 0 10.5 10.6Z" />
    </svg>
  )
}

export function IconPalm({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21v-9" />
      <path d="M12 12c-.6-3.4-4.2-4.8-8-4.2 3.2-2 6.8-1 8 1.2" />
      <path d="M12 12c.6-3.4 4.2-4.8 8-4.2-3.2-2-6.8-1-8 1.2" />
      <path d="M12 12c-1.6-3-1-6.8 1.2-9-2.2.8-3.4 4.4-1.2 6.6" />
      <path d="M9.5 21h5" />
    </svg>
  )
}

export function IconMosque({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M4 21V12" />
      <path d="M20 21V12" />
      <path d="M5 12a7 7 0 0 1 14 0" />
      <path d="M12 5c1.4 1 1.4 2.5 0 3.5-1.4-1-1.4-2.5 0-3.5Z" />
      <path d="M12 8.5V12" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <path d="M3 21h18" />
    </svg>
  )
}

export function IconBook({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M12 6.5C10.5 5 8 4.3 5 4.5v12c3-.2 5.5.5 7 2 1.5-1.5 4-2.2 7-2v-12c-3-.2-5.5.5-7 2Z" />
      <path d="M12 6.5v12" />
    </svg>
  )
}

export function IconSunrise({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M17 18a5 5 0 0 0-10 0" />
      <path d="M12 3v3M4.5 10.5l1.4 1.4M19.5 10.5l-1.4 1.4M2 18h2M20 18h2" />
      <path d="M3 21h18" />
    </svg>
  )
}

export function IconSun({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function IconSunset({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M17 18a5 5 0 0 0-10 0" />
      <path d="M12 9V4M4.5 10.5l1.4 1.4M19.5 10.5l-1.4 1.4M2 18h2M20 18h2" />
      <path d="M9.5 6.5 12 9l2.5-2.5" />
      <path d="M3 21h18" />
    </svg>
  )
}

const ICONS = {
  crescent: IconCrescent,
  palm: IconPalm,
  mosque: IconMosque,
  book: IconBook,
  sunrise: IconSunrise,
  sun: IconSun,
  sunset: IconSunset,
} as const

export type IconName = keyof typeof ICONS

export function RamadanIcon({ name, className }: { name: IconName; className?: string }) {
  const C = ICONS[name]
  return <C className={className} />
}

/* An eight-point star rosette (Rub el Hizb) used as a quiet ornament beside the timeline card. */
export function StarRosette({ className }: P) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" aria-hidden="true" className={className}>
      <circle cx="60" cy="60" r="52" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="60" r="44" strokeWidth="1.4" />
      <rect x="26" y="26" width="68" height="68" strokeWidth="1.4" />
      <rect x="26" y="26" width="68" height="68" strokeWidth="1.4" transform="rotate(45 60 60)" />
      <circle cx="60" cy="60" r="20" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="4" strokeWidth="1.2" fill="currentColor" />
    </svg>
  )
}
