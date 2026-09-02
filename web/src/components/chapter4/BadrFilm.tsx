'use client'

/* The Badr film — chapter 4's one narrated film.

   SAME CAPABILITIES AS CHAPTER 6'S PLAYER, not the same file: play/pause, mute
   with a volume slider, a seek bar, elapsed time, fullscreen, and subtitles set
   in the chapter's own type rather than burned into the picture. Chapter 6's
   StoryFilm is bound to its own asset, its own cues and its own title card;
   copying it would have made a fifth copy of a component this project has
   already booked for folding.

   THE NARRATION IS THE SOURCE. It reads §12 word for word, and the subtitles
   are that same sentence split at its own clause boundaries — scratchpad's cue
   builder refuses to emit film-cues.ts unless the pieces join back into the
   exact sentence, so no word can fall between two subtitles.

   NOTHING AUTOPLAYS. The film has a voice; a voice that starts on its own in a
   reading page is an ambush. It waits for the reader. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { FILM_CUES } from '@/lib/chapter4/film-cues'

const SRC = '/assets/chapter4/badr-battle.mp4'
const POSTER = '/assets/chapter4/badr-battle.jpg'
const VTT = '/assets/chapter4/badr-battle.vtt'

const clock = (v: number): string => {
  const s = Math.max(0, Math.round(v))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function BadrFilm() {
  const video = useRef<HTMLVideoElement | null>(null)
  const root = useRef<HTMLDivElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  /* the element is server-rendered and may know its duration before React
     attaches handlers, so read whatever is already there on mount */
  useEffect(() => {
    const v = video.current
    if (!v) return
    const sync = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration)
    }
    sync()
    v.addEventListener('loadedmetadata', sync)
    v.addEventListener('durationchange', sync)
    return () => {
      v.removeEventListener('loadedmetadata', sync)
      v.removeEventListener('durationchange', sync)
    }
  }, [])

  const toggle = useCallback(() => {
    const v = video.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }, [])

  const cue = FILM_CUES.find(([a, b]) => time >= a && time < b)

  return (
    <figure className="ch4-film" ref={root} data-reveal>
      <div className="ch4-film-media">
        <video
          ref={video}
          className="ch4-film-video"
          poster={POSTER}
          preload="metadata"
          playsInline
          muted={muted}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onClick={toggle}
        >
          <source src={SRC} type="video/mp4" />
          {/* the browser's own track, for a reader who turns captions on */}
          <track kind="captions" srcLang="he" label="עברית" src={VTT} default />
        </video>

        {/* our subtitle, in the chapter's type — the native one is styled by the
            browser and cannot be made to match the page */}
        {cue && <p className="ch4-film-cue">{cue[2]}</p>}

        {!playing && (
          <button type="button" className="ch4-film-play" onClick={toggle} aria-label="הפעלת הסרט">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      <div className="ch4-film-bar">
        <button type="button" onClick={toggle} aria-label={playing ? 'השהיה' : 'הפעלה'}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
          </svg>
        </button>

        <input
          className="ch4-film-seek"
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={time}
          onChange={(e) => {
            const v = video.current
            if (v) v.currentTime = Number(e.target.value)
          }}
          aria-label="מיקום בסרט"
        />
        <span className="ch4-film-time">
          {clock(time)} / {clock(duration)}
        </span>

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'ביטול השתקה' : 'השתקה'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            {muted ? (
              <path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3l3-3-1-1-3 3-3-3-1 1 3 3-3 3 1 1 3-3 3 3 1-1-3-3z" />
            ) : (
              <path d="M4 9v6h4l5 5V4L8 9H4zm12 3a4 4 0 00-2-3.46v6.92A4 4 0 0016 12z" />
            )}
          </svg>
        </button>
        <input
          className="ch4-film-vol"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const n = Number(e.target.value)
            setVolume(n)
            setMuted(n === 0)
            if (video.current) video.current.volume = n
          }}
          aria-label="עוצמת קול"
        />

        <button
          type="button"
          onClick={() => {
            const el = root.current
            if (!el) return
            if (document.fullscreenElement) void document.exitFullscreen()
            else void el.requestFullscreen?.()
          }}
          aria-label="מסך מלא"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
        </button>
      </div>
    </figure>
  )
}
