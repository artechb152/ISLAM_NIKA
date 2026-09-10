'use client'

/* ── סרט הסיכום, במסך מלא ──────────────────────────────────────────
   ישב ב-Game.tsx; דף הסיום צריך אותו גם, ולכן הוא קובץ משלו.

   מה שתוקן כאן: הסרט התחיל ‎muted={isMuted()}‎ — כלומר עם קול, אם
   צליל האתר דלוק — ודפדפן חוסם התחלה עם קול. ‎play()‎ נדחה, ‎playing‎
   נשאר על ‎false‎, והמסך הראה סרט קפוא עם „המשיכו" בלי שהמשתמש יבין
   למה. הוא מתחיל מושתק תמיד (מה שמותר), ולידו כפתור קול.

   נמדד: פס הקול של ‎ch1-summary.mp4‎ שקט לחלוטין (RMS 0) — הקריינות
   של הסרט הזה אינה קיימת כנכס. הכתוביות שבקובץ ה-VTT הן הערוץ. */

import { useCallback, useEffect, useRef, useState } from 'react'

export function ChapterFilm({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [])
  const toggle = useCallback(() => {
    const v = ref.current
    if (!v) return
    /* המשך מאותה נקודה בדיוק — אין טעינה מחדש ואין איפוס של currentTime */
    if (v.paused) void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    else v.pause()
  }, [])
  const toggleSound = useCallback(() => {
    const v = ref.current
    if (!v) return
    const next = !v.muted
    v.muted = next
    setMuted(next)
    if (!next && v.paused) void v.play().then(() => setPlaying(true)).catch(() => {})
  }, [])
  return (
    <div className="ch1-film" role="dialog" aria-label="סרטון סיכום הפרק">
      <video
        ref={ref}
        className="ch1-film-video"
        src="/assets/anim-video/ch1-summary.mp4"
        poster="/assets/anim-video/ch1-summary-poster.jpg"
        playsInline
        onEnded={() => { setPlaying(false); onDone() }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <track kind="subtitles" srcLang="he" label="עברית" default src="/assets/anim-video/ch1-summary.he.vtt" />
      </video>
      <div className="ch1-film-bar">
        <button type="button" className="hud-card-btn" onClick={toggle}>
          {playing ? '❚❚ השהו' : '▶ הפעילו'}
        </button>
        <button type="button" className="hud-card-btn" onClick={toggleSound}>
          {muted ? '🔇 הפעילו קול' : '🔊 השתיקו'}
        </button>
        <button type="button" className="hud-card-btn is-primary" onClick={onDone}>
          דלגו ←
        </button>
      </div>
    </div>
  )
}
