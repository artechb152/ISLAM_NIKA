'use client'

/* ── סוף הדרך ────────────────────────────────────────────────────────────
   האזור הזה היה עולם תלת-ממדי שאין בו מה לעשות: אין משימה, אין דמות
   לדבר איתה, ואין מה למסור. נשארו בו שני דברים בלבד — מה שראאווי אומר
   במבט לאחור, והאבן שעל המשקיף — ושניהם טקסט.

   קודם הסרט, במסך מלא ובלי שום דבר סביבו. אחריו — דף, ובמעטפת האתר:
   המסטהד, הבאנר, סרגל הצד והמקטעים של כל פרק אחר. הדף הכהה שעמד כאן
   קודם היה שפה גרפית שלישית באתר שיש לו אחת.

   מה שהמחברת רושמת נשאר זהה — אותו מפגש ואותו ממצא — ולכן הספירה
   בסוף הפרק אינה משתנה. */

import Link from 'next/link'
import { useEffect, useState } from 'react'

import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import { FINDS } from '@/lib/chapter1/finds'
import { REGIONS } from '@/lib/chapter1/dialogue'
import { recordEncounter, recordFind } from '@/lib/chapter1/notebook'
import { ChapterFilm } from './ChapterFilm'

const REGION = REGIONS.find((r) => r.id === 'exit')
const CLOSING = REGION?.encounters.find((e) => e.id === 'rawi-summary')
const STONE = FINDS.find((f) => f.id === 'find-exit-inscription')
/* שם האזור בנתונים הוא „יציאה — ערב עליית האסלאם"; הכותרת היא החלק השני */
const TITLE = (REGION?.name ?? 'ערב עליית האסלאם').split('—').pop()!.trim()

export default function ChapterOutro() {
  const [cinema, setCinema] = useState(true)

  /* המחברת נסגרת כאן בדיוק כפי שנסגרה קודם: המפגש נשמע, האבן נמצאה,
     והפרק מסומן כהושלם. בלי זה הספירה הייתה נעצרת על 20 מתוך 21. */
  useEffect(() => {
    if (CLOSING) recordEncounter(CLOSING.id, CLOSING.notebook)
    if (STONE) recordFind(STONE.id)
    try {
      localStorage.setItem('islam:chapter:1', 'done')
    } catch {}
  }, [])

  if (cinema) return <ChapterFilm onDone={() => setCinema(false)} />

  const stops = [
    { id: 'p1-end-words', label: 'רָאוִי, במבט לאחור', done: true },
    { id: 'p1-end-stone', label: STONE?.title ?? 'האבן על המשקיף', done: true },
    { id: 'p1-end-next', label: 'הלאה מכאן', done: false },
  ]

  return (
    <PracticeNav
      stops={stops}
      title="סוף הדרך"
      subtitle="פרק 1 · ערב טרום האסלאם"
      back={{ href: '/chapter1', label: 'חזרה לפרק 1' }}
    >
      <main className="chapter-article p2-main">
        <div className="ch2-hero p1-banner p1-end-banner">
          <div className="ch2-hero-media" aria-hidden="true" />
          <div className="ch2-hero-copy">
            <h1 id="p1-title" className="ch2-hero-title">
              {TITLE}
            </h1>
          </div>
        </div>

        <p className="p2-lead">
          המסע נגמר במכה. הסרט סיכם את הדרך; כאן דברי ראאווי במבט לאחור, והאבן שעל המשקיף.
        </p>
        <div className="p1-entry-actions p1-end-lead">
          <button type="button" className="hud-card-btn" onClick={() => setCinema(true)}>
            צפו בסרט שוב
          </button>
        </div>

        {CLOSING && (
          <section className="article-section" id="p1-end-words" aria-labelledby="p1-end-words-t">
            <header className="section-heading">
              <div>
                <h2 id="p1-end-words-t">רָאוִי, במבט לאחור</h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true">
                <span />
              </div>
            </header>
            {/* מספר הסעיף במקור (§) הוא סימון של הכותבים, לא של הלומד —
                הוא נשאר בנתונים בשביל שער הנאמנות ואינו מוצג, כמו בשיחות. */}
            <div className="p1-end-words">
              {CLOSING.lines.map((l, i) => (
                <p key={i}>{l.text}</p>
              ))}
            </div>
          </section>
        )}

        {STONE && (
          <section className="article-section" id="p1-end-stone" aria-labelledby="p1-end-stone-t">
            <header className="section-heading">
              <div>
                <h2 id="p1-end-stone-t">{STONE.title}</h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true">
                <span />
              </div>
            </header>
            <div className="p1-end-words">
              <p>{STONE.body}</p>
            </div>
          </section>
        )}

        <div className="p2-done p1-end-next" id="p1-end-next" role="status">
          <div className="title-ornament" aria-hidden="true">
            <span />
          </div>
          <p>הפרק הושלם.</p>
          <nav className="p1-entry-actions p1-end-nav" aria-label="הלאה מכאן">
            <Link className="ch2-end-link" href="/chapter1/practice">
              לתרגול המסכם
            </Link>
            <Link className="hud-card-btn" href="/notebook">
              מחברת המסע
            </Link>
            <Link className="hud-card-btn" href="/chapters">
              לרשימת הפרקים
            </Link>
          </nav>
        </div>
      </main>
    </PracticeNav>
  )
}
