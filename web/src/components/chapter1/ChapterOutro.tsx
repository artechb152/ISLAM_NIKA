'use client'

/* ── סוף הדרך ────────────────────────────────────────────────────────────
   האזור הזה היה עולם תלת-ממדי שאין בו מה לעשות: אין משימה, אין דמות
   לדבר איתה, ואין מה למסור. נשארו בו שני דברים בלבד — מה שראאווי אומר
   במבט לאחור, והאבן שעל המשקיף — ושניהם טקסט. עולם שלם נטען כדי
   להוליך אליהם רגליים.

   כאן הם עומדים כפי שהם: הסרטון שמסכם את הפרק, המילים שאחריו, והאבן.
   מה שהמחברת רושמת נשאר זהה — אותו מפגש ואותו ממצא — ולכן הספירה
   בסוף הפרק אינה משתנה. */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { FINDS } from '@/lib/chapter1/finds'
import { REGIONS } from '@/lib/chapter1/dialogue'
import { recordEncounter, recordFind } from '@/lib/chapter1/notebook'
import { ChapterFilm } from './ChapterFilm'

const REGION = REGIONS.find((r) => r.id === 'exit')
const CLOSING = REGION?.encounters.find((e) => e.id === 'rawi-summary')
const STONE = FINDS.find((f) => f.id === 'find-exit-inscription')

export default function ChapterOutro() {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  const [filmOver, setFilmOver] = useState(false)
  /* ── קודם הסרט, במסך מלא ────────────────────────────────────────
     הסרט ישב כאן בתוך תיבה ברוחב 760 פיקסלים. סרט סיכום הוא אולם, לא
     תיבה: הוא ממלא את המסך, ורק אחריו נפתח הדף עם המילים והאבן. */
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

  useEffect(() => {
    video.current?.play().catch(() => setPlaying(false))
  }, [])

  if (cinema) return <ChapterFilm onDone={() => setCinema(false)} />
  return (
    <main className="ch1-outro">
      <header className="ch1-outro-head">
        <p className="ch1-outro-eyebrow">סיום פרק א׳</p>
        <h1>{REGION?.name ?? 'ערב עליית האסלאם'}</h1>
      </header>

      <div className="ch1-outro-film">
        <video
          ref={video}
          src="/assets/anim-video/ch1-summary.mp4"
          poster="/assets/anim-video/ch1-summary-poster.jpg"
          playsInline
          muted={muted}
          onEnded={() => { setFilmOver(true); setPlaying(false) }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <track kind="subtitles" srcLang="he" label="עברית" default src="/assets/anim-video/ch1-summary.he.vtt" />
        </video>
        <div className="ch1-outro-bar">
          <button
            type="button"
            className="hud-card-btn"
            onClick={() => {
              const v = video.current
              if (!v) return
              if (v.paused) v.play().catch(() => {})
              else v.pause()
            }}
          >
            {playing ? 'השהו' : filmOver ? 'צפו שוב' : 'המשיכו'}
          </button>
          <button type="button" className="hud-card-btn" onClick={() => setMuted((m) => !m)}>
            {muted ? 'הפעילו קול' : 'השתיקו'}
          </button>
        </div>
      </div>

      {CLOSING && (
        <section className="ch1-outro-words" aria-label="דברי הסיכום">
          <h2>{'רָאוִי, במבט לאחור'}</h2>
          {CLOSING.lines.map((l, i) => (
            <p key={i}>
              <span>{l.text}</span>
              {l.source && <b className="ch1-outro-src">{l.source}</b>}
            </p>
          ))}
        </section>
      )}

      {STONE && (
        <section className="ch1-outro-stone" aria-label="הממצא האחרון">
          <h2>{STONE.title}</h2>
          <p>{STONE.body}</p>
          <b className="ch1-outro-src">{STONE.source}</b>
        </section>
      )}

      <nav className="ch1-outro-foot">
        <Link className="hud-card-btn is-primary" href="/chapter1/practice">לתרגול המסכם ←</Link>
        <Link className="hud-card-btn" href="/notebook">מחברת המסע</Link>
        <Link className="hud-card-btn" href="/chapters">לרשימת הפרקים</Link>
      </nav>
    </main>
  )
}
