'use client'

/* פרק 13 · כל הכרטיסים כטקסט (9.11.2026).

   האולם דורש הליכה — ומי שקורא בקורא מסך או רק במקלדת לא יכול ללכת בו. כאן 16 הכרטיסים
   ברצף, בסדר המקור, בדיאלוג אחד: כותרת לכל כרטיס (h3 תחת ה-h2 של הדיאלוג), התמונה עם ה-alt
   של הכותרת, והמוטיבים והציטוטים — אותו CardContent שהכרטיס באולם מרנדר, לא נוסח שני.

   כרטיס נספר כנקרא כשרובו (60% ממנו, או מגובה החלון אם הוא ארוך ממנו) נשאר מול העיניים
   DWELL מ"ש — כמו בפתיחת כרטיס באולם, לא כשגוללים על פניו. כך המונה, ה-16/16 והתרגול
   עובדים גם למי שלא הלך צעד.

   דיאלוג מודאלי: הפוקוס נלכד בתוכו (Tab ו-Shift+Tab מסתובבים), Esc סוגר, והפוקוס חוזר
   לכפתור שפתח אותו (FlagHall). הרשימה עצמה ניתנת לפוקוס כדי שאפשר יהיה לגלול אותה בחצים. */

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import passages from '@/lib/chapter13/passages.json'
import { CardContent, STATIONS } from './HallCard'
import { CONTACT, CONTACT_LEAD, PHONE, TEL } from '@/components/SiteFooter'

const DWELL = 600

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** שורת הקשר של האתר (SiteFooter) — האולם הוא מסך מלא בלי פוטר */
export function HallContact() {
  return (
    <p className="ch13-contact">
      {CONTACT_LEAD} {CONTACT}{' '}
      <a href={TEL} dir="ltr">
        {PHONE}
      </a>
    </p>
  )
}

export default function HallText({ read, onRead, onClose }: { read: string[]; onRead: (i: number) => void; onClose: () => void }) {
  const boxRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])

  /* קריאה = הכרטיס מול העיניים DWELL מ"ש. ספים צפופים כי כרטיס ארוך מהחלון (390px) חוצה את
     ה-60% של החלון ביחס שאינו אחד הספים הגסים */
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const timers = new Map<Element, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const need = Math.min(e.boundingClientRect.height, e.rootBounds?.height ?? Infinity) * 0.6
          const seen = e.isIntersecting && e.intersectionRect.height >= need
          const t = timers.get(e.target)
          if (seen && t === undefined) {
            const i = Number((e.target as HTMLElement).dataset.i)
            timers.set(
              e.target,
              window.setTimeout(() => {
                onRead(i)
                io.unobserve(e.target)
              }, DWELL),
            )
          } else if (!seen && t !== undefined) {
            window.clearTimeout(t)
            timers.delete(e.target)
          }
        }
      },
      { root: list, threshold: Array.from({ length: 21 }, (_, k) => k / 20) },
    )
    list.querySelectorAll('[data-i]').forEach((el) => io.observe(el))
    return () => {
      io.disconnect()
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [onRead])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !boxRef.current) return
    const f = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && (document.activeElement === first || !boxRef.current.contains(document.activeElement))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const done = read.length
  const all = STATIONS.length

  return (
    <div className="ch13-veil ch13-textveil" onClick={onClose}>
      <section
        ref={boxRef}
        className="ch13-textbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ch13-text-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="ch13-texthead">
          <p className="ch13-kicker">פרק 13 · {passages.title}</p>
          <h2 id="ch13-text-title">כל הכרטיסים כטקסט</h2>
          <p className="ch13-textcount">
            נקראו {done} מתוך {all}
          </p>
          <button ref={closeRef} type="button" className="ch13-close" onClick={onClose} aria-label="סגירה">
            ×
          </button>
        </header>
        <div ref={listRef} className="ch13-textlist" tabIndex={0} role="region" aria-labelledby="ch13-text-title">
          {STATIONS.map((st, i) => (
            <article key={st.sec} className="ch13-textcard" data-i={i} aria-labelledby={`ch13-text-${i + 1}`}>
              <CardContent i={i} level="h3" headingId={`ch13-text-${i + 1}`} read={read.includes(st.sec)} />
            </article>
          ))}
          <footer className="ch13-textfoot">
            {done === all && (
              <Link href="/chapter13/practice" className="ch13-go">
                לתרגול המסכם
              </Link>
            )}
            <HallContact />
          </footer>
        </div>
      </section>
    </div>
  )
}
