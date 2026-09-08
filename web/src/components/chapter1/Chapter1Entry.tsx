'use client'

/* ── מסך הכניסה לפרק 1 ─────────────────────────────────────────────────
   בנוי כמו דף התרגול של הפרק, ובאותה מעטפת: המסטהד של האתר, הבאנר של
   הפרק, וסרגל צד שהוא תצוגת ההתקדמות היחידה — וי ליד כל תחנה שכבר
   נעברה. מה שהמסך הכהה הקודם אמר בתמונה ובכפתור אחד נאמר כאן בשלושה
   מקטעים קצרים: מה זה, איך הולכים, ומה מחכה בדרך. */

import Link from 'next/link'
import { useEffect, useState } from 'react'

import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import { REGIONS } from '@/lib/chapter1/dialogue'
import { readNotebook, resetJourney } from '@/lib/chapter1/notebook'

/** תחנות הדרך — בלי אזור היציאה, שהוא דף הסיום */
const ROAD = REGIONS.filter((r) => r.id !== 'exit')

/* הוראות ההפעלה — אותם מקשים שלוח המקשים (H) מציג בתוך המשחק */
const HOW: { k: string; t: string }[] = [
  { k: 'W A S D', t: 'הליכה — קדימה, שמאלה, אחורה, ימינה. Shift לריצה, וגרירת העכבר מסובבת את המבט.' },
  { k: 'E', t: 'פעולה — לדבר עם מי שעומד לפניכם, לבחון ממצא שמאיר, או להתחיל את משימת התחנה.' },
  { k: 'F', t: 'בתחנות שבהן מסדרים דברים בידיים — פעולה במקלדת, במקום גרירה בעכבר.' },
  { k: 'J · M · H', t: 'מחברת המסע, מפת הדרך, ולוח המקשים — נפתחים בכל רגע.' },
]

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
  const stops = [
    { id: 'p1-entry-start', label: 'לפני שיוצאים', done: false },
    { id: 'p1-entry-how', label: 'איך הולכים', done: false },
    ...ROAD.map((r, i) => ({ id: `p1-r-${r.id}`, label: r.name, done: done || reached > i })),
    { id: 'p1-entry-end', label: 'סוף הדרך', done },
  ]

  return (
    <PracticeNav
      stops={stops}
      title="המסע"
      subtitle="פרק 1 · ערב טרום האסלאם"
      back={{ href: '/chapters', label: 'לכל הפרקים' }}
    >
      <main className="chapter-article p2-main">
        <div className="ch2-hero p1-banner">
          <div className="ch2-hero-media" aria-hidden="true" />
          <div className="ch2-hero-copy">
            <h1 id="p1-title" className="ch2-hero-title">
              מסע אל ערב טרום האסלאם
            </h1>
          </div>
        </div>

        <section className="article-section" id="p1-entry-start" aria-labelledby="p1-entry-start-t">
          <header className="section-heading">
            <div>
              <h2 id="p1-entry-start-t">לפני שיוצאים לדרך</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true">
              <span />
            </div>
          </header>
          <p className="p2-lead">
            הפרק הזה אינו מאמר אלא דרך: מצטרפים לשיירה, חוצים תשעה מקומות מרמות תימן ועד מכה,
            ופוגשים את האנשים, המקומות והמושגים שעיצבו את חצי האי ערב ערב עליית האסלאם. מה שנשמע
            ונמצא בדרך נרשם במחברת המסע, ובסופה מחכים דברי הסיכום והתרגול.
          </p>
          <div className="p1-entry-actions" aria-busy={!know}>
            {know && resumeAt ? (
              <>
                <button type="button" className="hud-card-btn is-primary" onClick={() => go(`?region=${resumeAt}&from=resume`)}>
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
              <button type="button" className="hud-card-btn is-primary" disabled={!know} onClick={() => go('')}>
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
        </section>

        <section className="article-section" id="p1-entry-how" aria-labelledby="p1-entry-how-t">
          <header className="section-heading">
            <div>
              <h2 id="p1-entry-how-t">איך הולכים</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true">
              <span />
            </div>
            <p>ארבעה דברים, וזה הכול. בתוך המשחק המקש H פותח את אותה רשימה.</p>
          </header>
          <ul className="p1-takeaways p1-how">
            {HOW.map((h) => (
              <li key={h.k}>
                <b className="p1-how-k">{h.k}</b>
                {h.t}
              </li>
            ))}
          </ul>
        </section>

        <section className="article-section" id="p1-entry-route-s" aria-labelledby="p1-entry-route-t">
          <header className="section-heading">
            <div>
              <h2 id="p1-entry-route-t">תחנות הדרך</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true">
              <span />
            </div>
            <p>{resumeAt ? 'המסע נשמר. אפשר להמשיך מן התחנה שבה נעצרתם.' : 'תשעה מקומות, מדרום לצפון ובחזרה למכה. כל תחנה נפתחת רק אחרי קודמתה.'}</p>
          </header>
          <ol className="p1-entry-route">
            {ROAD.map((r, i) => {
              const isDone = done || reached > i
              const isHere = !done && reached === i
              return (
                <li key={r.id} id={`p1-r-${r.id}`} className={isDone ? 'is-done' : isHere ? 'is-current' : undefined}>
                  <span className="p1-entry-n">{String(i + 1).padStart(2, '0')}</span>
                  <span>{r.name}</span>
                  <span className="p1-entry-state">{isDone ? 'נעברה' : isHere ? 'כאן נעצרתם' : ''}</span>
                </li>
              )
            })}
            <li id="p1-entry-end" className={done ? 'is-done' : undefined}>
              <span className="p1-entry-n">{String(ROAD.length + 1).padStart(2, '0')}</span>
              <span>סוף הדרך — ערב עליית האסלאם</span>
              <span className="p1-entry-state">{done ? 'הושלם' : ''}</span>
            </li>
          </ol>
        </section>
      </main>
    </PracticeNav>
  )
}
