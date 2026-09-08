'use client'

/* סרט הסיכום במסך מלא. ישב בתוך Game.tsx; דף הסיום צריך אותו גם, ולכן
   הוא קובץ משלו — קטן, בלי תלות בעולם. */

import { useEffect, useRef, useState } from 'react'
import { isMuted } from '@/lib/chapter1/audio'

export function ChapterFilm({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMutedState] = useState(() => isMuted())
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.play().catch(() => setPlaying(false))
  }, [])
  return (
    <div className="ch1-film" role="dialog" aria-label="סרטון סיכום הפרק">
      <video
        ref={ref}
        className="ch1-film-video"
        src="/assets/anim-video/ch1-summary.mp4"
        poster="/assets/anim-video/ch1-summary-poster.jpg"
        playsInline
        muted={muted}
        onEnded={onDone}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <track kind="subtitles" srcLang="he" label="עברית" default src="/assets/anim-video/ch1-summary.he.vtt" />
      </video>
      <div className="ch1-film-bar">
        <button type="button" className="hud-card-btn" onClick={() => {
          const v = ref.current
          if (!v) return
          if (v.paused) v.play().catch(() => {})
          else v.pause()
        }}>{playing ? 'השהו' : 'המשיכו'}</button>
        <button type="button" className="hud-card-btn" onClick={() => setMutedState((m) => !m)}>
          {muted ? 'הפעילו קול' : 'השתיקו'}
        </button>
        <button type="button" className="hud-card-btn is-primary" onClick={onDone}>
          דלגו ←
        </button>
      </div>
    </div>
  )
}
