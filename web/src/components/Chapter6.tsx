'use client'

/* Chapter 6 (was chapter6.html's body plus its nine <script> tags).

   React renders the chapter's chrome — the header, the rail, the navbar, the drawer and the
   film's scaffolding — and then hands the page to the engine, exactly as the script tags did.
   Everything below #chapter and #rail-list is still built imperatively by the engine and the
   mechanisms; React deliberately renders those two as empty containers and never touches them
   again. That is what lets 3,000 lines of measured, hard-won DOM code carry across untouched.

   The ids and class names are not incidental: lesson.css, mech.css and film.css are the
   original files, byte for byte, so the DOM they style has to keep exactly this shape. */

import { useEffect } from 'react'
import { createEngine } from '@/lib/chapter6/engine'
import { initFilm } from '@/lib/chapter6/film'

export default function Chapter6() {
  useEffect(() => {
    /* the engine first: the film reads its state and calls start() on the handoff */
    const engine = createEngine()
    const film = initFilm()
    return () => {
      film.destroy()
      engine.destroy()
    }
  }, [])

  return (
    <>
      {/* ============ the chapter (revealed out of the film's last frame) ============ */}
      <div id="lesson" hidden>
        <header className="site">
          <div className="header-inner">
            <a className="logo-link" href="/" aria-label="חזרה למסך הבית">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo" src="/assets/logo-cream.png" alt="אסלאם" />
            </a>
            <a className="back-link" href="/chapters">
              <svg viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
              לפרקי הלמידה
            </a>
          </div>
        </header>

        <nav className="rail" aria-label="התקדמות בפרק">
          <div className="rail-inner">
            <ol id="rail-list" />
            <span className="count" id="rail-count" />
          </div>
        </nav>

        <main className="chapter" id="chapter" />

        <div className="navbar">
          <div className="navbar-inner">
            <button className="btn btn-ghost" id="btn-prev" type="button">
              <svg viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
              <span className="label">חזרה</span>
            </button>
            <p className="nav-hint" id="nav-hint" />
            <button className="btn btn-primary" id="btn-next" type="button">
              <span className="label">המשך</span>
              <svg viewBox="0 0 24 24">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ============ story drawer (screen 01, optional) ============ */}
      <div className="drawer-scrim" id="drawer-scrim" />
      <aside
        className="drawer"
        id="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-hidden="true"
      >
        <div className="drawer-head">
          <h2 id="drawer-title" />
          <button className="drawer-close" id="drawer-close" type="button" aria-label="סגירה">
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {/* the body scrolls, so it must be reachable by keyboard: without a tab stop the story
            can be opened but not read without a mouse */}
        <div className="drawer-body" id="drawer-body" tabIndex={0} />
      </aside>

      {/* ============ screen 00 — the existing approved film ============
          The film opens on its own first frame, held. The picture IS the play control:
          one click starts it with full sound from the first second. Browsers forbid
          autoplaying sound, so starting on a click is what lets the narration run at all. */}
      <div id="film" tabIndex={0} role="button" aria-label="הפעלת סרטון הפתיחה">
        <section className="fscene" data-i="0">
          <video
            muted
            playsInline
            preload="auto"
            poster="/assets/anim-video/poster1.jpg"
            src="/assets/anim-video/scene1.mp4"
          />
          <div className="grade" />
        </section>
        <section className="fscene" data-i="1">
          <video muted playsInline preload="auto" src="/assets/anim-video/scene2.mp4" />
          <div className="grade" />
        </section>
        <section className="fscene" data-i="2">
          <video muted playsInline preload="auto" src="/assets/anim-video/scene3.mp4" />
          <div className="grade" />
        </section>
        <section className="fscene" data-i="3">
          <div className="pillars" id="pillars-mid" />
        </section>
        <section className="fscene" data-i="4">
          <video muted playsInline preload="auto" src="/assets/anim-video/scene5.mp4" />
          <div className="grade" />
        </section>
        <section className="fscene" data-i="5">
          <video muted playsInline preload="auto" src="/assets/anim-video/scene6.mp4" />
          <div className="grade" />
        </section>
        {/* last scene: the five commandments settle and stay on screen for the handoff */}
        <section className="fscene" data-i="6">
          <div className="pillars is-outro" id="pillars-out" />
        </section>

        <div id="film-big">
          <span />
        </div>
        <div id="film-subs">
          <p className="cue" role="status" aria-live="polite" />
        </div>

        <div id="film-controls" role="group" aria-label="בקרת הסרטון">
          <button id="fc-play" type="button" aria-label="השהיה" />
          <button id="fc-mute" type="button" aria-label="השתקה" />
          {/* a real range: dragging seeks, clicking the track jumps, arrows step —
              one control that is both a YouTube-style scrubber and keyboard-operable */}
          <input
            id="fc-seek"
            type="range"
            min="0"
            max="100"
            step="0.1"
            defaultValue="0"
            aria-label="מיקום בסרטון"
          />
          <span id="fc-time" aria-hidden="true">
            0:00 / 1:12
          </span>
          <button id="fc-skip" type="button">
            דילוג
          </button>
        </div>

        <div id="skip-confirm" hidden>
          <div className="sc-card" role="dialog" aria-modal="true" aria-labelledby="sc-title">
            <h2 id="sc-title">לדלג על הסרטון?</h2>
            <p>
              הסרטון מציג את הסיפור שעליו נבנה הפרק. הטקסט המלא שלו יישאר זמין בכל רגע מתוך המסך
              הבא, בכפתור „לקריאת הסיפור המלא”.
            </p>
            <div className="sc-actions">
              <button className="fg-btn fg-ghost" id="sc-cancel" type="button">
                חזרה לסרטון
              </button>
              <button className="fg-btn fg-primary" id="sc-ok" type="button">
                דילוג והמשך
              </button>
            </div>
          </div>
        </div>

        <audio id="a0" preload="auto" src="/assets/anim-voice/scene1.mp3" />
        <audio id="a1" preload="auto" src="/assets/anim-voice/scene2.mp3" />
        <audio id="a2" preload="auto" src="/assets/anim-voice/scene3.mp3" />
        <audio id="a3" preload="auto" src="/assets/anim-voice/scene4.mp3" />
        <audio id="a4" preload="auto" src="/assets/anim-voice/scene5.mp3" />
        <audio id="a5" preload="auto" src="/assets/anim-voice/scene6.mp3" />
        <audio id="a6" preload="auto" src="/assets/anim-voice/scene7.mp3" />
      </div>
    </>
  )
}
