'use client'

/* The chapter's opening film — a compact video player with subtitles (from film-cues.ts),
   play/pause, mute + volume slider, a seek bar, elapsed time, and a fullscreen button. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { FILM_CUES } from './film-cues'

export interface FilmProps {
  /** the mp4; defaults to chapter 6's opening film */
  src?: string
  poster?: string
  /** the standard caption resource offered to assistive tech and native caption UI */
  captions?: string
  /** [start, end, text] — the styled subtitles drawn over the picture */
  cues?: Array<[number, number, string]>
  /** opening title card drawn in OUR font over the first seconds; '' disables it */
  title?: string
  titleFrom?: number
  titleTo?: number
  /** the one line that breaks out of its plate and fills the frame; '' disables it */
  reveal?: string
  label?: string
}

const CH6 = {
  src: '/assets/ch6-story.mp4',
  poster: '/assets/ch6-story-poster.jpg',
  captions: '/assets/ch6-story.vtt',
  title: 'מדינה',
  titleFrom: 0.3,
  titleTo: 4.5,
  reveal: 'גבריאל',
  label: 'סרטון הפתיחה של פרק 6',
}

function formatTime(value: number): string {
  const seconds = Math.max(0, Math.round(value))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function StoryFilm({
  src = CH6.src,
  poster = CH6.poster,
  captions = CH6.captions,
  cues = FILM_CUES,
  title = CH6.title,
  titleFrom = CH6.titleFrom,
  titleTo = CH6.titleTo,
  reveal = CH6.reveal,
  label = CH6.label,
}: FilmProps = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [finished, setFinished] = useState(false)

  /* The video is server-rendered and starts loading its metadata immediately, so
     loadedmetadata/durationchange can fire BEFORE React hydrates and attaches the handlers —
     the initial duration would then be missed and the seek bar/total would stay stuck. On mount
     we read whatever duration is already known and keep listening for later updates (some MP4s
     reveal the real length only via a later durationchange). */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = (): void => {
      const d = video.duration
      if (Number.isFinite(d) && d > 0) setDuration(d)
    }
    sync()
    video.addEventListener('durationchange', sync)
    video.addEventListener('loadedmetadata', sync)
    return () => {
      video.removeEventListener('durationchange', sync)
      video.removeEventListener('loadedmetadata', sync)
    }
  }, [])

  const showTitle = title !== '' && time >= titleFrom && time <= titleTo

  const caption = useMemo(() => {
    const cue = cues.find(([start, end]) => time >= start && time <= end)
    return cue ? cue[2] : ''
  }, [time, cues])

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

  function changeVolume(value: number): void {
    const video = videoRef.current
    setVolume(value)
    if (video) video.volume = value
    if (value === 0) setMuted(true)
    else if (muted) setMuted(false)
  }

  function toggleFullscreen(): void {
    const el = rootRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen()
  }

  const total = duration || 1
  const shownVolume = muted ? 0 : volume

  return (
    <div className="story-film" ref={rootRef} aria-label={label}>
      <div className="story-film-stage">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          muted={muted}
          onClick={togglePlayback}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            event.currentTarget.volume = volume
          }}
          onEnded={() => {
            setPlaying(false)
            setFinished(true)
          }}
        >
          {/* standard caption resource (same narration as the on-screen captions); not shown by
              default so it never double-renders over the styled captions, but available to
              assistive tech and any native caption UI */}
          <track kind="captions" src={captions} srcLang="he" label="עברית" />
        </video>
        <span className="story-film-grade" aria-hidden="true" />
        {title && (
          <span className={'story-film-title' + (showTitle ? ' is-on' : '')} aria-hidden="true">
            {title}
          </span>
        )}
        <p className={'story-film-caption' + (reveal !== '' && caption.includes(reveal) ? ' is-reveal' : '')} aria-live="polite">
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

      {/* Laid out like a standard video player: the scrubber gets its own full-width row, and
          below it play/volume/elapsed sit on the left with the actions pushed to the right. The
          bar carries dir="ltr" against the RTL page so both sliders fill left→right and the
          drag/arrow-key directions match. */}
      <div className="story-film-bar" dir="ltr">
        <input
          type="range"
          className="film-seek"
          min="0"
          max={total}
          step="0.1"
          value={time}
          aria-label="מיקום בסרטון"
          aria-valuetext={`${formatTime(time)} מתוך ${formatTime(total)}`}
          onChange={(event) => seek(Number(event.target.value))}
          style={{ ['--film-progress' as string]: `${(time / total) * 100}%` }}
        />
        <div className="story-film-controls" role="group" aria-label="בקרת הסרטון">
          <button type="button" onClick={togglePlayback} aria-label={playing ? 'השהיית הסרטון' : finished ? 'הפעלת הסרטון מחדש' : 'הפעלת הסרטון'}>
            {playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <span className="film-vol">
            <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'ביטול השתקה' : 'השתקת הסרטון'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={muted ? 'M4 9v6h4l5 4V5L8 9H4m8 1 7 7m0-7-7 7' : 'M4 9v6h4l5 4V5L8 9H4m8.5-1a5 5 0 0 1 0 8'} />
              </svg>
            </button>
            <input
              type="range"
              className="film-volume"
              min="0"
              max="1"
              step="0.05"
              value={shownVolume}
              aria-label="עוצמת קול"
              onChange={(event) => changeVolume(Number(event.target.value))}
              style={{ ['--film-progress' as string]: `${shownVolume * 100}%` }}
            />
          </span>
          <span className="film-time" aria-hidden="true">{formatTime(time)} / {formatTime(total)}</span>
          <button type="button" className="film-fs" onClick={toggleFullscreen} aria-label="מסך מלא">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
