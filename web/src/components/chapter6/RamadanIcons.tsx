/* Line-art icons for the Ramadan timeline medallions (RamadanTimeline).
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

const ICONS = {
  crescent: IconCrescent,
  palm: IconPalm,
  mosque: IconMosque,
  book: IconBook,
} as const

export type IconName = keyof typeof ICONS

export function RamadanIcon({ name, className }: { name: IconName; className?: string }) {
  const C = ICONS[name]
  return <C className={className} />
}
