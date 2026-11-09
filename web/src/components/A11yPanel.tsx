'use client'
/* כפתור הנגישות (המשתמשת, 9.11.2026: „לחשוב על דרך הנגשה" — „כן תעשה את זה").

   ארבע התאמות, כל אחת class על <html> כך שהיא חלה על כל עמוד בלי לגעת בעמוד עצמו:
     a11y-zoom-1 / -2   הגדלת הכול ב-115% / 130% (‏zoom ולא font-size: האתר כתוב ב-px)
     a11y-contrast      ניגודיות מוגברת
     a11y-still         בלי אנימציות, וכל וידאו נעצר — גם כזה שעולה אחר כך
     a11y-links         קו תחתון לכל קישור
   ההעדפות נשמרות בדפדפן (‏a11y:v1) ומוחלות לפני הציור הראשון ככל שאפשר — ראו
   A11Y_BOOT, סקריפט קטן שה-layout מריץ בראש <body>. */
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export const A11Y_KEY = 'a11y:v1'
type Prefs = { zoom: 0 | 1 | 2; contrast: boolean; still: boolean; links: boolean }
const NONE: Prefs = { zoom: 0, contrast: false, still: false, links: false }

/* runs inline before React hydrates, so a reader who set 130% does not see the page jump */
export const A11Y_BOOT = `try{var p=JSON.parse(localStorage.getItem('${A11Y_KEY}')||'null');if(p){var c=document.documentElement.classList;if(p.zoom)c.add('a11y-zoom-'+p.zoom);if(p.contrast)c.add('a11y-contrast');if(p.still)c.add('a11y-still');if(p.links)c.add('a11y-links')}}catch(e){}`

function read(): Prefs {
  try {
    return { ...NONE, ...(JSON.parse(localStorage.getItem(A11Y_KEY) || 'null') ?? {}) }
  } catch {
    return NONE
  }
}

function apply(p: Prefs) {
  const c = document.documentElement.classList
  c.toggle('a11y-zoom-1', p.zoom === 1)
  c.toggle('a11y-zoom-2', p.zoom === 2)
  c.toggle('a11y-contrast', p.contrast)
  c.toggle('a11y-still', p.still)
  c.toggle('a11y-links', p.links)
}

function pauseAll() {
  document.querySelectorAll('video').forEach((v) => {
    if (!v.paused) v.pause()
  })
}

export default function A11yPanel() {
  const [open, setOpen] = useState(false)
  const [p, setP] = useState<Prefs>(NONE)
  const panel = useRef<HTMLDivElement | null>(null)
  const button = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setP(read()), [])

  useEffect(() => {
    apply(p)
    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify(p))
    } catch {}
    if (!p.still) return
    /* videos that autoplay later (scroll-loaded clips, a hero that starts on load) */
    pauseAll()
    const onPlay = (e: Event) => { if (e.target instanceof HTMLVideoElement && !e.target.controls) e.target.pause() }
    document.addEventListener('play', onPlay, true)
    return () => document.removeEventListener('play', onPlay, true)
  }, [p])

  /* close on Escape / outside click, and give focus back to the button */
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('button')?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus() } }
    const down = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', down) }
  }, [open])

  const set = (patch: Partial<Prefs>) => setP((x) => ({ ...x, ...patch }))
  const changed = p.zoom !== 0 || p.contrast || p.still || p.links

  return (
    <>
      <button
        ref={button}
        type="button"
        className={'a11y-btn' + (changed ? ' is-on' : '')}
        aria-label="התאמות נגישות"
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <circle cx="12" cy="4.2" r="2.2" />
          <path d="M4.2 7.6c-.6-.2-1.2.1-1.4.7s.1 1.2.7 1.4c1.9.6 3.9 1 5.9 1.2v3.2l-2.1 6.6c-.2.6.2 1.2.8 1.4.6.2 1.2-.2 1.4-.8L11.6 15h.8l2.1 6.3c.2.6.8 1 1.4.8.6-.2 1-.8.8-1.4l-2.1-6.6v-3.2c2-.2 4-.6 5.9-1.2.6-.2.9-.8.7-1.4s-.8-.9-1.4-.7c-2.5.8-5.1 1.2-7.8 1.2s-5.3-.4-7.8-1.2Z" />
        </svg>
      </button>
      {open && (
        <div ref={panel} id="a11y-panel" className="a11y-panel" role="dialog" aria-label="התאמות נגישות">
          <p className="a11y-title">התאמות נגישות</p>
          <div className="a11y-row" role="group" aria-label="גודל התצוגה">
            <span>גודל התצוגה</span>
            <div className="a11y-seg">
              {(['רגיל', 'גדול', 'גדול מאוד'] as const).map((label, i) => (
                <button key={label} type="button" aria-pressed={p.zoom === i} onClick={() => set({ zoom: i as Prefs['zoom'] })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="a11y-toggle" aria-pressed={p.contrast} onClick={() => set({ contrast: !p.contrast })}>
            ניגודיות גבוהה
          </button>
          <button type="button" className="a11y-toggle" aria-pressed={p.still} onClick={() => set({ still: !p.still })}>
            עצירת אנימציות וסרטונים
          </button>
          <button type="button" className="a11y-toggle" aria-pressed={p.links} onClick={() => set({ links: !p.links })}>
            הדגשת קישורים
          </button>
          <div className="a11y-foot">
            <button type="button" className="a11y-reset" disabled={!changed} onClick={() => setP(NONE)}>
              איפוס
            </button>
            <Link href="/accessibility">הצהרת נגישות</Link>
          </div>
        </div>
      )}
    </>
  )
}
