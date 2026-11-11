'use client'

/* ── סרט הסיכום, במסך מלא ──────────────────────────────────────────
   ישב ב-Game.tsx; דף הסיום צריך אותו גם, ולכן הוא קובץ משלו.

   מה שתוקן כאן: הסרט התחיל ‎muted={isMuted()}‎ — כלומר עם קול, אם
   צליל האתר דלוק — ודפדפן חוסם התחלה עם קול. ‎play()‎ נדחה, ‎playing‎
   נשאר על ‎false‎, והמסך הראה סרט קפוא עם „המשיכו" בלי שהמשתמש יבין
   למה. הוא מתחיל מושתק תמיד (מה שמותר), ולידו כפתור קול.

   פס הקול של ‎ch1-summary.mp4‎ עצמו שקט לחלוטין (RMS 0). הקריינות היא
   קובצי ‎narration/‎ הנפרדים, והם *נעולים* על שעון הווידאו ולא רצים
   לצידו: כל פריים נבדק איזה קטע אמור להישמע עכשיו ובאיזו נקודה בתוכו,
   וסטייה של יותר מרבע שנייה מתוקנת במקום. לכן השהיה, המשך וקפיצה
   אינם יכולים להוציא אותם מסנכרון — אין שני שעונים, יש אחד. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CH1_SUMMARY_NARRATION } from '@/lib/chapter1/narration'

export function ChapterFilm({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const narr = useRef<HTMLAudioElement>(null)
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
    /* הקריינות הולכת עם הקול של הסרט: כיבוי הקול משתיק גם אותה, ואי
       אפשר שתישאר מדברת מעל סרט מושתק. */
    const n = narr.current
    if (n) { n.muted = next; if (next) n.pause() }
    if (!next && v.paused) void v.play().then(() => setPlaying(true)).catch(() => {})
  }, [])

  /* ── הקריינות, נעולה על שעון הווידאו ──────────────────────────────
     נגן אחד, לא עשרה: בכל פריים נשאלת אותה שאלה — איזה קטע אמור
     להישמע בשנייה הזאת של הסרט, ומאיזו נקודה בתוכו. אם זה קטע אחר,
     הוא נטען; אם זו אותה נקודה, לא נוגעים; ואם נפערה סטייה גדולה
     מ-0.25 שנייה (השהיה, קפיצה, פריים שנתקע) היא מתוקנת מיד. */
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const n = narr.current
    if (!n) return
    let raf = 0
    let at = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = v.currentTime
      let i = -1
      for (let k = 0; k < CH1_SUMMARY_NARRATION.length; k++) {
        if (t >= CH1_SUMMARY_NARRATION[k].at) i = k
        else break
      }
      if (i < 0 || v.muted) {
        if (!n.paused) n.pause()
        at = -1
        return
      }
      const cue = CH1_SUMMARY_NARRATION[i]
      const into = t - cue.at
      if (i !== at) {
        at = i
        n.src = cue.src
        n.currentTime = Math.max(0, into)
      }
      /* עבר סוף הקטע — שקט עד הבא */
      if (n.duration && into > n.duration + 0.15) {
        if (!n.paused) n.pause()
        return
      }
      if (v.paused) {
        if (!n.paused) n.pause()
        return
      }
      /* חזרה מהשהיה מסנכרנת מחדש תמיד, ולא רק כשנפערה סטייה: הנגן
         מתחיל לנגן כמה עשיריות אחרי שהוא מתבקש, והשעון של הסרט כבר
         זז בינתיים. בלי זה החזרה נכנסה באיחור שנשאר תלוי באוויר. */
      if (n.paused) {
        if (Number.isFinite(into)) n.currentTime = Math.max(0, into)
        void n.play().catch(() => {})
        return
      }
      if (Math.abs(n.currentTime - into) > 0.2 && Number.isFinite(into)) n.currentTime = Math.max(0, into)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      n.pause()
    }
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
      {/* נגן הקריינות — אינו נראה, ואינו מתנגן מעצמו: הוא נגרר אחרי
          שעון הווידאו בלבד (ראו את האפקט למעלה). */}
      <audio ref={narr} preload="auto" muted aria-hidden="true" />
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
