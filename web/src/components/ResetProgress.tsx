'use client'
/* „איפוס התקדמות" — שורה בתפריט של מסך הפרקים, וחלון אישור. הפעולה הרסנית, ולכן:
   · החלון נפתח עם הפוקוס על „ביטול" ולא על „איפוס";
   · שני הדברים האישיים (המחברת, היסטוריית המבחנים) לא מסומנים כברירת מחדל;
   · החלון מצויר ב-portal אל ה-body — המגירה של הטלפון היא `transform`, וב-`transform` ה-fixed של
     צאצא נמדד מהמגירה ולא מהמסך;
   · Tab לא יוצא ממנו, Esc סוגר, והפוקוס חוזר לשורה שפתחה אותו. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resetProgress } from '@/lib/reset-progress'

export default function ResetProgress({ onOpen }: { onOpen?: () => void }) {
  const [open, setOpen] = useState(false)
  const [notebook, setNotebook] = useState(false)
  const [exams, setExams] = useState(false)
  const [done, setDone] = useState(false)
  const opener = useRef<HTMLButtonElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const cancel = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    opener.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    cancel.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !done) {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab' || !box.current) return
      const f = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')]
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      const at = document.activeElement
      if (e.shiftKey && at === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && at === last) {
        e.preventDefault()
        first.focus()
      } else if (!box.current.contains(at)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', key, true)
    return () => document.removeEventListener('keydown', key, true)
  }, [open, done, close])

  const run = () => {
    resetProgress({ notebook, exams })
    setDone(true)
    /* המסך קורא את האחסון כשהוא עולה — הטענה מחדש מציגה אותו נקי */
    /* ההודעה „ההתקדמות אופסה." צריכה זמן להיקרא לפני שהעמוד נטען מחדש */
    window.setTimeout(() => window.location.reload(), 1800)
  }

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="m-item x-item reset-row"
        data-tip="איפוס התקדמות"
        aria-haspopup="dialog"
        onClick={() => {
          onOpen?.()
          setDone(false)
          setNotebook(false)
          setExams(false)
          setOpen(true)
        }}
      >
        <span className="x-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4v5h5M20 20v-5h-5M5.6 15.2A8 8 0 0 0 19 17M18.4 8.8A8 8 0 0 0 5 7" />
          </svg>
        </span>
        <span className="m-text">
          <span className="m-name">איפוס התקדמות</span>
          <span className="m-desc">מוחק מהדפדפן הזה מה שקראתם ופתרתם</span>
        </span>
      </button>
      {open &&
        createPortal(
          <div className="reset-scrim" onClick={() => !done && close()}>
            <div
              ref={box}
              className="reset-box"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-title"
              aria-describedby="reset-text"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="reset-title" className="reset-title">איפוס התקדמות</h2>
              <p id="reset-text" className="reset-text">
                הפעולה תמחק מהדפדפן הזה את מה שנשמר: אילו מקטעים קראתם, התשובות בתרגולים והציונים שלהם, וסימון „הושלם” של הפרקים. אי אפשר לשחזר.
              </p>
              <label className="reset-check">
                <input type="checkbox" checked={notebook} disabled={done} onChange={(e) => setNotebook(e.target.checked)} />
                <span>גם „המחברת שלי” — הסימונים וההערות</span>
              </label>
              <label className="reset-check">
                <input type="checkbox" checked={exams} disabled={done} onChange={(e) => setExams(e.target.checked)} />
                <span>גם היסטוריית המבחנים</span>
              </label>
              <p className="reset-note" role="status">{done ? 'ההתקדמות אופסה.' : ''}</p>
              <div className="reset-actions">
                <button type="button" className="reset-go" disabled={done} onClick={run}>איפוס</button>
                <button ref={cancel} type="button" className="reset-cancel" disabled={done} onClick={close}>ביטול</button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
