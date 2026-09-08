'use client'

/* ── מסך הפתיחה של פרק 1 ─────────────────────────────────────────────
   מסך אחד, משחקי: תמונה על כל המסך, כותרת, שורה אחת ולחצן — כך ביקשה
   הבעלים. מה שמחבר אותו לאתר הוא לא מבנה של מאמר אלא החלקים עצמם:
   המסטהד של האתר (אותן מחלקות, לא חיקוי), צעיף הבאנר של הפרקים,
   Kedem 900 בקרם, לחצן הסיום של פרק 2 כלחצן ראשי, ורצועת קלף בתחתית
   שבה תשע התחנות — עם וי ליד מה שכבר נעבר. */

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { REGIONS } from '@/lib/chapter1/dialogue'
import { readNotebook, resetJourney } from '@/lib/chapter1/notebook'

/** תחנות הדרך — בלי אזור היציאה, שהוא דף הסיום */
const ROAD = REGIONS.filter((r) => r.id !== 'exit')

/* המשחק יושב ב-play/ מתחת לכתובת הזאת. ניווט מלא ולא ניווט צד־לקוח:
   העולם נבנה פעם אחת בטעינת המודול וקורא את `?region=` מן הכתובת,
   ולכן כניסה עם אזור חייבת להיות טעינה חדשה. יחסית ל-pathname, כי
   באתר החי יש basePath. */
function go(search: string): void {
  const base = window.location.pathname.replace(/\/$/, '')
  window.location.assign(`${base}/play/${search}`)
}

export default function Chapter1Entry() {
  const [know, setKnow] = useState(false)
  const [resumeAt, setResumeAt] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    /* קישורים ישנים אל /chapter1?region=… — המשחק עבר, הקישור ממשיך לעבוד */
    if (q.has('region') || q.has('from')) {
      go(`?${q.toString()}`)
      return
    }
    const store = readNotebook()
    if (store.seen.length > 0 || store.entries.length > 0) setResumeAt(store.region || 'yemen-heights')
    try {
      setDone(localStorage.getItem('islam:chapter:1') === 'done')
    } catch {}
    setKnow(true)
    /* מושכים את צ׳אנק המשחק בזמן שקוראים את המסך — כדי ש„טוען את
       המסע…" לא יהיה המסך הראשון אחרי הלחיצה */
    void import('@/components/chapter1/Game')
  }, [])

  const reached = resumeAt ? ROAD.findIndex((r) => r.id === resumeAt) : -1

  return (
    <div className="chapter-page p1-open">
      {/* המסטהד של האתר — אותן מחלקות שבמאמר ובתרגול */}
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <Link className="chapter-logo" href="/chapters" aria-label="חזרה לעמוד הפרקים">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-cream.png" alt="אסלאם" />
            </Link>
          </div>
          <Link className="gv-back" href="/chapters">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
            לכל הפרקים
          </Link>
        </div>
      </header>

      <main className="p1-open-stage" aria-labelledby="p1-open-title">
        <div className="p1-open-media" aria-hidden="true" />
        <div className="p1-open-copy">
          <p className="p1-open-kicker">פרק ראשון · מסע</p>
          <h1 id="p1-open-title">ערב טרום האסלאם</h1>
          <p className="p1-open-lead">
            הצטרפו לשיירה, חצו תשעה מקומות מרמות תימן ועד מכה, ופגשו את האנשים, המקומות והמושגים
            שעיצבו את חצי האי ערב ערב עליית האסלאם.
          </p>
          <p className="p1-open-keys">
            <b>W A S D</b>הליכה · <b>E</b>לדבר, לבחון, לפעול · <b>H</b>כל המקשים
          </p>
          <div className="p1-open-actions" aria-busy={!know}>
            {know && resumeAt ? (
              <>
                <button type="button" className="ch2-end-link" onClick={() => go(`?region=${resumeAt}&from=resume`)}>
                  המשיכו במסע ←
                </button>
                <button
                  type="button"
                  className="hud-card-btn"
                  onClick={() => {
                    if (!window.confirm('להתחיל מסע חדש? ההתקדמות והמחברת יימחקו.')) return
                    resetJourney()
                    go('')
                  }}
                >
                  מסע חדש מההתחלה
                </button>
              </>
            ) : (
              <button type="button" className="ch2-end-link" disabled={!know} onClick={() => go('')}>
                התחילו במסע ←
              </button>
            )}
            {done && (
              <>
                <Link className="hud-card-btn" href="/chapter1/end">
                  דף הסיום
                </Link>
                <Link className="hud-card-btn" href="/chapter1/practice">
                  התרגול המסכם
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* תשע התחנות — על קלף, כמו כרטיסי הפרקים; וי ליד מה שנעבר */}
      <nav className="p1-open-route" aria-label="תחנות הדרך">
        <ol>
          {ROAD.map((r, i) => {
            const isDone = done || reached > i
            const isHere = !done && reached === i
            return (
              <li key={r.id} className={isDone ? 'is-done' : isHere ? 'is-current' : undefined}>
                <span className="p1-open-n">{String(i + 1).padStart(2, '0')}</span>
                <span>{r.name}</span>
                {isDone && (
                  <svg className="p1-open-tick" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5 10 17.5 19 7.5" />
                  </svg>
                )}
                {isHere && <span className="sr-only"> — כאן נעצרתם</span>}
              </li>
            )
          })}
          <li className={done ? 'is-done' : undefined}>
            <span className="p1-open-n">{String(ROAD.length + 1).padStart(2, '0')}</span>
            <span>סוף הדרך</span>
            {done && (
              <svg className="p1-open-tick" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5 10 17.5 19 7.5" />
              </svg>
            )}
          </li>
        </ol>
      </nav>
    </div>
  )
}
