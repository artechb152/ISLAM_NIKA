'use client'

/* "הוספה למחברת" — הכפתור הקטן שצץ כשמסמנים משפט בתוך פרק.

   מרכיבים אותו פעם אחת בעמוד הפרק עם מספר הפרק. הוא מקשיב לבחירת
   טקסט; אם היא נופלת בתוך הטקסט של הפרק (ולא בתפריט/כותרת), הוא מציג
   כפתור צף מעל הבחירה. לחיצה שומרת את המשפט במחברת עם הפרק שממנו בא
   וכותרת הסעיף שבו עמד. אין כאן כתיבה — רק סימון. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { addMark } from '@/lib/site-notebook'

/* אזורים שבהם סימון אינו "ציטוט מהפרק": ניווט, כותרות מסך, פקדים */
const IGNORE = 'nav, header, aside, button, input, textarea, select, .chapter-drawer, .chapter-site-header, .nb-mark-fab'

/* ברירת המחדל מכסה את שני מבני הפרקים: המאמר (.chapter-article) והקומיקס
   של פרק 3 (.c3-shell). אפשר לדרוס עם prop לפרק בעל מבנה משלו. */
export default function MarkToNotebook({ ch, root = '.chapter-article, .c3-page' }: { ch: number; root?: string }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const [saved, setSaved] = useState(false)
  const pending = useRef<{ text: string; where?: string } | null>(null)
  const fab = useRef<HTMLDivElement | null>(null)

  const hide = useCallback(() => {
    setAt(null)
    setSaved(false)
    pending.current = null
  }, [])

  useEffect(() => {
    /* הבחירה נקראת אחרי שהעכבר/האצבע שוחררו — במהלך הגרירה היא עוד משתנה */
    const onRelease = (e: Event) => {
      if (fab.current && e.target instanceof Node && fab.current.contains(e.target)) return
      window.setTimeout(() => {
        const sel = window.getSelection()
        const text = sel?.toString() ?? ''
        if (!sel || sel.isCollapsed || text.trim().length < 2) {
          hide()
          return
        }
        const node = sel.anchorNode
        const el = (node?.nodeType === 1 ? (node as Element) : node?.parentElement) ?? null
        if (!el || !el.closest(root) || el.closest(IGNORE)) {
          hide()
          return
        }
        /* איפה זה עמד — הכותרת הקרובה ביותר מעל הבחירה */
        const section = el.closest('section, .article-section')
        const head = section?.querySelector('h2, h3')
        const rect = sel.getRangeAt(0).getBoundingClientRect()
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          hide()
          return
        }
        pending.current = { text, where: head?.textContent?.trim() || undefined }
        setSaved(false)
        setAt({ x: rect.left + rect.width / 2, y: rect.top })
      }, 10)
    }
    const onScrollOrKey = () => hide()
    document.addEventListener('mouseup', onRelease)
    document.addEventListener('touchend', onRelease)
    window.addEventListener('scroll', onScrollOrKey, true)
    window.addEventListener('resize', onScrollOrKey)
    return () => {
      document.removeEventListener('mouseup', onRelease)
      document.removeEventListener('touchend', onRelease)
      window.removeEventListener('scroll', onScrollOrKey, true)
      window.removeEventListener('resize', onScrollOrKey)
    }
  }, [root, hide])

  const save = () => {
    const p = pending.current
    if (!p) return
    addMark(ch, p.text, p.where)
    setSaved(true)
    window.getSelection()?.removeAllRanges()
    window.setTimeout(hide, 1250)
  }

  if (!at) return null

  /* הכפתור נצמד למעל הבחירה, בגבולות המסך */
  const x = Math.min(Math.max(at.x, 96), window.innerWidth - 96)
  const top = at.y > 64 ? at.y - 46 : at.y + 26

  return (
    <div
      ref={fab}
      className={`nb-mark-fab${saved ? ' is-saved' : ''}`}
      style={{ left: x, top }}
      role="status"
      onMouseDown={(e) => e.preventDefault()}
    >
      {saved ? (
        <span className="nb-mark-done">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
          נוסף למחברת
        </span>
      ) : (
        <button type="button" onClick={save}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />
          </svg>
          הוספה למחברת
        </button>
      )}
    </div>
  )
}
