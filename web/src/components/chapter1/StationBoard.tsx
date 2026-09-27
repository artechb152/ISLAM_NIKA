'use client'
/* ── כרטיס התחנה ולוח התחנה ──────────────────────────────────────────────
 *
 * „לא לומדים ממנו, קשה לעקוב." עד כאן כל עובדה בפרק נאמרה פעם אחת בחלון
 * שיחה ונעלמה: בזמן המשחק לא עמד על המסך שום דבר שנשאר — לא השאלה של
 * הדרך, לא השאלה של התחנה, ולא מה שכבר נאמר בה.
 *
 * הרכיב הזה הוא מה שנשאר. בראשו שאלת התחנה (`region.ask`), מתחתיה השאלה
 * של הדרך כולה וחמש החוליות, ומתחתן „מה נאמר כאן": שורת ה-`key` של כל
 * מפגש ליבה בתחנה, בסדר התסריט. מפגש שנשמע — השורה שלו עומדת בלוח עם
 * הדובר וה-§; מפגש שעוד לא — מקום ריק עם שם מי שיאמר אותו, כך שרואים
 * כמה נשאר ולמי.
 *
 * אין כאן מחרוזת לימודית חדשה: הכול נקרא מ-dialogue.json ומ-links.ts.
 * הרכיב טהור — מתרנדר רק כש-`seen`/`solved` משתנים, לא בזמן הליכה. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { SPEAKERS, type Region, type SpeakerId } from '@/lib/chapter1/dialogue'
import { CHAPTER_QUESTION, type LinkState } from '@/lib/chapter1/links'
import type { Script } from '@/lib/chapter1/script'
import type { Task } from '@/lib/chapter1/tasks'

export interface BoardNote {
  id: string
  who: string
  text: string
  source: string
  heard: boolean
}

/** שורות הלוח: שורת ה-key של כל מפגש ליבה, בסדר התסריט */
export function boardNotes(region: Region, script: Script, seen: string[]): BoardNote[] {
  const out: BoardNote[] = []
  for (const step of script) {
    if (step.kind !== 'talk' || !step.core) continue
    const enc = region.encounters.find((e) => e.id === step.id)
    const line = enc?.lines.find((l) => l.key)
    if (!enc || !line) continue
    const speaker: SpeakerId = line.speaker ?? enc.speaker
    out.push({
      id: enc.id,
      who: (SPEAKERS as Record<string, string>)[speaker] ?? '',
      text: line.text,
      source: line.source,
      heard: seen.includes(enc.id),
    })
  }
  return out
}

const OPEN_KEY = 'ch1:board:open:v1'

export function StationBoard({ region, script, seen, links, review = false, raised = false }: {
  region: Region
  script: Script
  seen: string[]
  links: LinkState[]
  /** תחנה שאינה מלמדת דבר חדש אלא חוזרת על הקודמות */
  review?: boolean
  /** מעל שכבת המשימה, כדי שהלוח ייקרא לצד כרטיס המשימה */
  raised?: boolean
}) {
  const notes = useMemo(() => boardNotes(region, script, seen), [region, script, seen])
  /* פתוח כברירת מחדל על מסך רחב, מקופל לשבב בטלפון; הבחירה נזכרת */
  const [open, setOpen] = useState(true)
  useEffect(() => {
    let v: string | null = null
    try { v = localStorage.getItem(OPEN_KEY) } catch { /* אחסון חסום */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- קריאה חד-פעמית מהאחסון אחרי ההרכבה
    setOpen(v === null ? window.innerWidth >= 900 : v === '1')
  }, [])
  const toggle = () => {
    setOpen((o) => {
      try { localStorage.setItem(OPEN_KEY, o ? '0' : '1') } catch { /* אחסון חסום */ }
      return !o
    })
  }
  const heard = notes.filter((n) => n.heard).length
  if (!region.ask) return null
  return (
    <aside
      className={'hud-panel ch1-board' + (open ? ' is-open' : '') + (raised ? ' is-raised' : '')}
      aria-label="התחנה: השאלה ומה שנאמר בה"
    >
      <button type="button" className="ch1-board-toggle" onClick={toggle} aria-expanded={open}>
        <span className="ch1-board-eyebrow">
          {review ? 'תחנת חזרה' : 'שאלת התחנה'}
          {notes.length > 0 && <span className="ch1-board-count"> · {heard} מתוך {notes.length}</span>}
        </span>
        <b className="ch1-board-ask">{region.ask.text}</b>
        <svg className="ch1-board-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5 12 15l5.5-5.5" /></svg>
      </button>
      {open && (
        <div className="ch1-board-body">
          <p className="ch1-board-chapter">
            <span>השאלה של הדרך</span>
            {CHAPTER_QUESTION.text}
          </p>
          <ol className="ch1-board-links" aria-label="חמש החוליות של התשובה">
            {links.map((l) => (
              <li
                key={l.id}
                className={(l.done ? 'is-done' : '') + (l.region === region.id ? ' is-here' : '')}
                title={l.done ? l.key.text : undefined}
              >
                {l.label}
              </li>
            ))}
          </ol>
          {notes.length > 0 && (
            <>
              <h3 className="ch1-board-title">מה נאמר כאן</h3>
              <ul className="ch1-board-notes">
                {notes.map((n) =>
                  n.heard ? (
                    <li key={n.id} className="is-heard">
                      <span className="ch1-board-who">{n.who}</span>
                      <p>{n.text}</p>
                      <i className="ch1-board-src" dir="ltr">{n.source}</i>
                    </li>
                  ) : (
                    <li key={n.id} className="is-pending">
                      עוד לשמוע: <span className="ch1-board-who">{n.who}</span>
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </aside>
  )
}

/* ── כרטיס הסיכום ─────────────────────────────────────────────────────────
 *
 * ארבע מתוך שבע התחנות נסגרו במשפט אחד בתוך פאנל המשימה, והלומד יצא
 * לשער בלי לדעת מה לקח מהתחנה. כאן, לפני היציאה: שאלת התחנה, מה נאמר
 * בה (אותן שורות key של הלוח), מה עלה במשימה (`task.done`), ואם התחנה
 * קונה חוליה — איזו, ובאיזה משפט היא נכנסת לתשובה (`key.text`).
 * הכול מן הנתונים; שום משפט לימודי לא נכתב כאן. */
export function StationSummary({ region, script, seen, links, task, solved, review = false, onClose }: {
  region: Region
  script: Script
  seen: string[]
  links: LinkState[]
  task: Task | null
  solved: string[]
  review?: boolean
  onClose: () => void
}) {
  const notes = boardNotes(region, script, seen).filter((n) => n.heard)
  const earned = links.filter((l) => l.region === region.id && l.done)
  const taskDone = task && solved.includes(task.id) ? task : null
  /* מיקוד בלי גלילה: autoFocus גלל את הכרטיס אל הכפתור שבתחתיתו, ובטלפון
     הכרטיס נפתח מן האמצע — בלי השאלה ובלי השורה הראשונה */
  const go = useRef<HTMLButtonElement>(null)
  useEffect(() => { go.current?.focus({ preventScroll: true }) }, [])
  return (
    <div className="ch1-task ch1-summary" role="dialog" aria-modal="true" aria-labelledby="ch1-summary-title">
      <div className="ch1-task-card ch1-summary-card">
        <p className="ch1-summary-eyebrow">{review ? 'סיכום · תחנת חזרה' : 'סיכום התחנה'} · {region.name}</p>
        {region.ask && (
          <h2 id="ch1-summary-title" className="ch1-summary-ask">
            {region.ask.text} <i className="ch1-board-src" dir="ltr">{region.ask.source}</i>
          </h2>
        )}
        {notes.length > 0 && (
          <section className="ch1-summary-block">
            <h3>מה נאמר כאן</h3>
            <ul className="ch1-board-notes">
              {notes.map((n) => (
                <li key={n.id}>
                  <span className="ch1-board-who">{n.who}</span>
                  <p>{n.text}</p>
                  <i className="ch1-board-src" dir="ltr">{n.source}</i>
                </li>
              ))}
            </ul>
          </section>
        )}
        {taskDone && (
          <section className="ch1-summary-block">
            <h3>מה עלה במשימה</h3>
            <p className="ch1-summary-done">
              {taskDone.done} <i className="ch1-board-src" dir="ltr">{taskDone.source}</i>
            </p>
          </section>
        )}
        {earned.map((l) => (
          <section key={l.id} className="ch1-summary-block ch1-summary-link">
            <h3>נוספה חוליה: {l.label}</h3>
            <p>
              {l.key.text} <i className="ch1-board-src" dir="ltr">{l.key.source}</i>
            </p>
          </section>
        ))}
        <ol className="ch1-board-links ch1-summary-chain" aria-label="חמש החוליות של התשובה">
          {links.map((l) => (
            <li key={l.id} className={(l.done ? 'is-done' : '') + (l.region === region.id ? ' is-here' : '')}>
              {l.label}
            </li>
          ))}
        </ol>
        <div className="ch1-summary-actions">
          <button ref={go} type="button" className="hud-card-btn is-primary" onClick={onClose}>
            המשיכו בדרך
          </button>
        </div>
      </div>
    </div>
  )
}
