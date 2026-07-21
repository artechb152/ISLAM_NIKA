'use client'

/* The chapter's opening film — the NEW single-file cut (ch6-story.mp4), with subtitles
   rendered as the same caption strip the composite player used. The cues live in
   film-cues.ts (generated from the narration by transcription, then hand-checked);
   regenerating them never touches this player. */

import { useMemo, useRef, useState } from 'react'
import { FILM_CUES } from './film-cues'

const SRC = '/assets/ch6-story.mp4'
const POSTER = '/assets/ch6-story-poster.jpg'

function formatTime(value: number): string {
  const seconds = Math.max(0, Math.round(value))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function StoryFilm() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [finished, setFinished] = useState(false)

  const caption = useMemo(() => {
    const cue = FILM_CUES.find(([start, end]) => time >= start && time <= end)
    return cue ? cue[2] : ''
  }, [time])

  function togglePlayback(): void {
    const video = videoRef.current
    if (!video) return
    if (finished) {
      video.currentTime = 0
      setFinished(false)
      video.play().catch(() => setPlaying(false))
      setPlaying(true)
      return
    }
    if (playing) {
      video.pause()
      setPlaying(false)
    } else {
      video.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  function seek(value: number): void {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value
    setTime(value)
    setFinished(false)
  }

  const total = duration || 1

  return (
    <div className="story-film" aria-label="סרטון הפתיחה של פרק 6">
      <div className="story-film-stage">
        <video
          ref={videoRef}
          src={SRC}
          poster={POSTER}
          playsInline
          preload="metadata"
          muted={muted}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => {
            setPlaying(false)
            setFinished(true)
          }}
        />
        <span className="story-film-grade" aria-hidden="true" />
        <p className="story-film-caption" aria-live="polite">
          {caption}
        </p>
        {!playing && !finished && (
          <button className="story-film-big-play" type="button" onClick={togglePlayback} aria-label="הפעלת הסרטון">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      <div className="story-film-controls" role="group" aria-label="בקרת הסרטון">
        <button type="button" onClick={togglePlayback} aria-label={playing ? 'השהיית הסרטון' : finished ? 'הפעלת הסרטון מחדש' : 'הפעלת הסרטון'}>
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'ביטול השתקה' : 'השתקת הסרטון'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={muted ? 'M4 9v6h4l5 4V5L8 9H4m8 1 7 7m0-7-7 7' : 'M4 9v6h4l5 4V5L8 9H4m8.5-1a5 5 0 0 1 0 8'} />
          </svg>
        </button>
        <input
          type="range"
          min="0"
          max={total}
          step="0.1"
          value={time}
          aria-label="מיקום בסרטון"
          aria-valuetext={`${formatTime(time)} מתוך ${formatTime(total)}`}
          onChange={(event) => seek(Number(event.target.value))}
          style={{ ['--film-progress' as string]: `${(time / total) * 100}%` }}
        />
        <span aria-hidden="true" dir="ltr">{formatTime(time)} / {formatTime(total)}</span>
      </div>
    </div>
  )
}
