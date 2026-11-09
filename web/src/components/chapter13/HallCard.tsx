/* פרק 13 · תוכן הכרטיס — אחד לאולם ולגרסת הטקסט (9.11.2026).

   הכרטיס שנפתח ליד דגל באולם (CardView ב-FlagHall) וכל אחד מ-16 הכרטיסים בגרסת הטקסט
   (HallText) מרנדרים את אותו רכיב, מאותם נתונים — כך שאין נוסח שני של הכרטיס שיכול לסטות.
   בלי three: גרסת הטקסט צריכה לעבוד גם כשהאולם לא נטען.

   הקומפוננטה לא כותבת משפט לימודי. הכותרת, התווית, המוטיבים והציטוטים באים מ-passages.json
   (§N); ה-alt של התמונה הוא כותרת הכרטיס עצמה. */

import passages from '@/lib/chapter13/passages.json'
import layout from '@/lib/chapter13/layout.json'

export const ART = '/assets/chapter13/'

export type Line = { text: string; b?: string[] }
export type Card = {
  title: { text: string; name: string }
  label?: string
  items?: Line[]
  quotes?: (Line & { ref?: string })[]
}
export type Station = { sec: string; kind: 'flag' | 'emblem'; tex: string; crop?: number[]; hall?: string }

export const STATIONS = layout.stations as Station[]
export const CARDS = passages.passages as Record<string, Card>

function Bolded({ line }: { line: Line }) {
  const out: React.ReactNode[] = []
  let at = 0
  for (const b of line.b ?? []) {
    const i = line.text.indexOf(b, at)
    if (i < 0) continue
    if (i > at) out.push(line.text.slice(at, i))
    out.push(<b key={i}>{b}</b>)
    at = i + b.length
  }
  if (at < line.text.length) out.push(line.text.slice(at))
  return <>{out}</>
}

/** כותרת, תמונה, מוטיבים וציטוטים של תחנה i. `level` — h2 בכרטיס הבודד, h3 ברשימה שיש לה כותרת משלה */
export function CardContent({ i, level, headingId, read = false }: { i: number; level: 'h2' | 'h3'; headingId: string; read?: boolean }) {
  const st = STATIONS[i]
  const c = CARDS[st.sec]
  const rest = c.title.text.slice(c.title.name.length).trim()
  const H = level
  return (
    <>
      <p className="ch13-kicker">
        תחנה {i + 1} מתוך {STATIONS.length}
        {read && <span className="ch13-seen"> · נקרא</span>}
      </p>
      <H id={headingId}>{c.title.name}</H>
      {rest && <p className="ch13-sub">{rest}</p>}
      <figure className={`ch13-art is-${st.kind}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ART}flags/${st.tex}`} alt={c.title.text} />
      </figure>
      {c.label && <p className="ch13-label">{c.label}</p>}
      {c.items && (
        <ul className="ch13-items">
          {c.items.map((it, k) => (
            <li key={k}>
              <Bolded line={it} />
            </li>
          ))}
        </ul>
      )}
      {c.quotes?.map((q, k) => (
        <blockquote key={k} className="ch13-quote">
          <p>
            <Bolded line={q} />
          </p>
          {q.ref && <cite>{q.ref}</cite>}
        </blockquote>
      ))}
    </>
  )
}
