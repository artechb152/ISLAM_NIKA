'use client'
/* הסיור של מסך הפרקים (המשתמשת, 9.11.2026: „מישהו שנכנס לבד לאתר לא יבין איך להשתמש בזה
   … לא יבינו מה זה המחברת שלי וחדר המבחנים — צריך שיהיה הסבר על זה מחוץ לדפים של זה").

   בכניסה הראשונה למסך הפרקים: כמה בועות, כל אחת מצביעה על חלק במסך ואומרת מה הוא ומה
   עושים בו. אחרי שנסגר הוא לא חוזר מעצמו (‏chapters:tour:v1), וכפתור „?" בכותרת מפעיל
   אותו שוב. בטלפון התפריט סגור, ולכן הבועות של הכלים מצביעות על ההמבורגר ואומרות
   שהם שם. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export const TOUR_KEY = 'chapters:tour:v1'
export const TOUR_EVENT = 'chapters:tour'

type Step = { target: string | null; mobileTarget?: string; title: string; text: string; mobileText?: string }

const STEPS: Step[] = [
  {
    target: null,
    title: 'ברוכים הבאים',
    text: 'סיור קצר במה שיש באתר — פחות מחצי דקה. אפשר לדלג, ולחזור אליו בכל רגע מכפתור ה-? שבראש המסך.',
  },
  {
    target: '.cards',
    title: 'פרקי הלמידה',
    text: 'כל כרטיס הוא פרק. לחצו כדי להתחיל לקרוא. ההתקדמות נשמרת, והפס שמתחת לכרטיס מראה כמה כבר קראתם.',
  },
  {
    target: '.menu-tools',
    mobileTarget: '.hamburger',
    title: 'כלי עזר',
    text: 'מילון מונחים, ספרות מומלצת, מקורות ומפות — לעיון בכל רגע, גם באמצע פרק.',
    mobileText: 'בתפריט הזה: מילון מונחים, ספרות מומלצת, מקורות ומפות — לעיון בכל רגע.',
  },
  {
    target: '.menu-exam:not(.menu-notebook)',
    mobileTarget: '.hamburger',
    title: 'חדר המבחנים',
    text: 'מבחן תרגול על הפרקים שתבחרו: בוחרים כמה שאלות ואם יש הגבלת זמן, עונים שאלה אחר שאלה, ובסוף מקבלים ציון ורואים מה נכון.',
    mobileText: 'גם חדר המבחנים בתפריט: מבחן תרגול על הפרקים שתבחרו, שאלה אחר שאלה, עם ציון בסוף.',
  },
  {
    target: '.menu-notebook',
    mobileTarget: '.hamburger',
    title: 'המחברת שלי',
    text: 'בזמן קריאה בפרק, סמנו משפט בעכבר ולחצו „הוספה למחברת". כל מה שסימנתם נאסף כאן לפי פרקים, אפשר להוסיף לו הערה, והוא נשאר מודגש בפרק.',
    mobileText: 'ובתפריט גם המחברת שלי: בזמן קריאה סמנו משפט ולחצו „הוספה למחברת" — כל מה שסימנתם נאסף שם.',
  },
  {
    target: '.a11y-btn',
    title: 'נגישות',
    text: 'הכפתור הזה נמצא בכל עמוד: הגדלת התצוגה, ניגודיות גבוהה ועצירת אנימציות.',
  },
]

type Box = { x: number; y: number; w: number; h: number }

function visible(sel: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? el : null
}

export default function ChaptersTour({ isDesktop }: { isDesktop: boolean }) {
  const [step, setStep] = useState<number | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const next = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setStep(null)
    try {
      localStorage.setItem(TOUR_KEY, 'done')
    } catch {}
  }, [])

  /* first visit opens it; the header's ? button opens it again */
  useEffect(() => {
    let seen = false
    try {
      seen = !!localStorage.getItem(TOUR_KEY)
    } catch {}
    const t = seen ? undefined : window.setTimeout(() => setStep(0), 900)
    const open = () => setStep(0)
    window.addEventListener(TOUR_EVENT, open)
    return () => { window.clearTimeout(t); window.removeEventListener(TOUR_EVENT, open) }
  }, [])

  const s = step === null ? null : STEPS[step]
  const sel = s ? (!isDesktop && s.mobileTarget) || s.target : null

  /* measure the target; scroll it into view first if it is off screen */
  useLayoutEffect(() => {
    if (!sel) { setBox(null); return }
    const el = visible(sel)
    if (!el) { setBox(null); return }
    const r0 = el.getBoundingClientRect()
    /* the header and the a11y button are fixed — scrolling the page cannot bring them closer */
    const pinned = !!el.closest('.site-hdr, .a11y-btn')
    if (!pinned && (r0.top < 60 || r0.top > window.innerHeight * 0.6)) el.scrollIntoView({ block: 'center', behavior: 'auto' })
    const measure = () => {
      const r = el.getBoundingClientRect()
      const pad = 8
      /* the card grid is taller than the screen — light only the part that shows */
      const top = pinned ? r.top : Math.max(r.top, 64)
      const bottom = Math.min(r.bottom, window.innerHeight - 8)
      setBox({ x: r.left - pad, y: top - pad, w: r.width + pad * 2, h: Math.max(bottom - top, 40) + pad * 2 })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [sel, step])

  useEffect(() => {
    if (step === null) return
    next.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      /* RTL: the arrow that points forward on the page is the left one */
      if (e.key === 'ArrowLeft') setStep((n) => (n === null ? n : Math.min(n + 1, STEPS.length - 1)))
      if (e.key === 'ArrowRight') setStep((n) => (n === null ? n : Math.max(n - 1, 0)))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [step, close])

  if (step === null || !s) return null
  const last = step === STEPS.length - 1
  const text = (!isDesktop && s.mobileText) || s.text

  /* the bubble sits beside the lit box — under it if there is room, else above; centred
     on screen when the step points at nothing */
  let style: React.CSSProperties = {}
  let side = 'center'
  if (box) {
    const W = Math.min(340, window.innerWidth - 32)
    const left = Math.min(Math.max(box.x + box.w / 2 - W / 2, 16), window.innerWidth - W - 16)
    if (box.w > window.innerWidth * 0.5) {
      /* a wide target (the card grid): the bubble floats over its upper part */
      style = { left: Math.min(Math.max(box.x + box.w - W - 24, 16), window.innerWidth - W - 16), top: Math.max(box.y + 24, 80), width: W }
      side = 'over'
    } else if (box.x > window.innerWidth * 0.55 && box.h > 160) {
      /* a tall narrow target at the right edge (the side menu on desktop) — to its left */
      style = { left: Math.max(box.x - W - 18, 16), top: Math.min(Math.max(box.y, 80), window.innerHeight - 300), width: W }
      side = 'left'
    } else if (box.y + box.h + 230 < window.innerHeight) {
      style = { left, top: box.y + box.h + 14, width: W }
      side = 'below'
    } else {
      style = { left, top: Math.max(box.y - 14, 16), width: W, transform: 'translateY(-100%)' }
      side = 'above'
    }
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      {box ? (
        <div className="tour-hole" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} aria-hidden="true" />
      ) : (
        <div className="tour-dim" aria-hidden="true" onClick={close} />
      )}
      <div className={'tour-bubble is-' + side} style={style}>
        <p className="tour-count" aria-hidden="true">
          {step + 1} מתוך {STEPS.length}
        </p>
        <h2 id="tour-title" className="tour-title">{s.title}</h2>
        <p id="tour-text" className="tour-text">{text}</p>
        <div className="tour-actions">
          <button ref={next} type="button" className="tour-next" onClick={() => (last ? close() : setStep(step + 1))}>
            {step === 0 ? 'בואו נתחיל' : last ? 'סיום' : 'הבא'}
          </button>
          {step > 0 && (
            <button type="button" className="tour-prev" onClick={() => setStep(step - 1)}>
              הקודם
            </button>
          )}
          {!last && (
            <button type="button" className="tour-skip" onClick={close}>
              דילוג על הסיור
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
