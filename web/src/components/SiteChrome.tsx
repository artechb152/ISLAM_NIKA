'use client'
/* Two small pieces of chrome every page shares (a reviewer's notes, 9.11.2026):

   „סימן טעינה" — almost every move between pages here is a full page load (each chapter is
   its own root layout), and on the heavy chapters the screen sat blank for seconds with no
   sign that anything was happening. A thin bar runs along the top from the moment a link is
   clicked; the next page's own HTML starts with the bar already running and finishes it when
   the page has loaded — so the bar carries across the reload instead of restarting at zero.

   „הדרכה בהאבר" (the user: „תווית") — buttons that are only an icon (the hamburger, the logo,
   close, play) already carry their name in aria-label for screen readers. Hovering or tabbing
   to one now shows that same name in a small tag under it. The name is not written twice:
   the tag reads aria-label (or data-tip), and appears only when the control has no visible
   text of its own. Not on touch — there is no hover, and a tap must stay a tap.

   The chapters screen's collapsed rail has its own side-pointing tag (.rail-tip) and is
   skipped here. Chapter 1 does not load this (the user: not touching chapter 1 for now). */
import '@/styles/site-chrome.css'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Tip = { label: string; x: number; y: number; below: boolean }

const TIP_TARGET = 'button, a, [role="button"], [role="tab"], summary'

function labelOf(el: HTMLElement): string {
  const tip = el.dataset.tip ?? el.getAttribute('aria-label') ?? ''
  if (!tip.trim()) return ''
  /* a control with its own visible words needs no tag */
  if (!el.dataset.tip && (el.innerText ?? '').trim()) return ''
  return tip.trim()
}

export default function SiteChrome() {
  const pathname = usePathname()
  /* 'run' from the server render on: the page is loading until the browser says it isn't */
  const [bar, setBar] = useState<'run' | 'done' | 'idle'>('run')
  const [tip, setTip] = useState<Tip | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const first = useRef(true)

  /* finish the bar this page arrived with */
  useEffect(() => {
    const finish = () => setBar('done')
    if (document.readyState === 'complete') finish()
    else window.addEventListener('load', finish, { once: true })
    /* back/forward from the bfcache restores the page as it was left — bar running */
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) finish() }
    window.addEventListener('pageshow', onShow)
    return () => { window.removeEventListener('load', finish); window.removeEventListener('pageshow', onShow) }
  }, [])

  /* a client-side move inside one layout (no reload) ends here */
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setBar('done')
    setTip(null)
  }, [pathname])

  useEffect(() => {
    if (bar !== 'done') return
    const t = window.setTimeout(() => setBar('idle'), 450)
    return () => window.clearTimeout(t)
  }, [bar])

  /* start the bar on any click that is going to leave this page */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      if (url.pathname === location.pathname && url.search === location.search) return // a hash jump
      setBar('run')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  /* hover / focus labels */
  useEffect(() => {
    const hide = () => { window.clearTimeout(timer.current); setTip(null) }
    const show = (target: EventTarget | null, delay: number) => {
      window.clearTimeout(timer.current)
      const el = target instanceof Element ? (target.closest(TIP_TARGET) as HTMLElement | null) : null
      if (!el || el.closest('.side.is-collapsed') || el.closest('canvas')) return hide()
      const label = labelOf(el)
      if (!label) return hide()
      timer.current = window.setTimeout(() => {
        const r = el.getBoundingClientRect()
        if (!r.width) return
        const below = r.bottom + 44 < window.innerHeight
        setTip({ label, x: r.left + r.width / 2, y: below ? r.bottom + 9 : r.top - 9, below })
      }, delay)
    }
    const over = (e: PointerEvent) => { if (e.pointerType !== 'touch') show(e.target, 280) }
    const out = (e: PointerEvent) => {
      const to = e.relatedTarget as Element | null
      const from = (e.target as Element | null)?.closest?.(TIP_TARGET)
      if (from && to && from.contains(to)) return
      hide()
    }
    const focus = (e: FocusEvent) => {
      /* only keyboard focus — a mouse click focuses too, and the tag would stick */
      if ((e.target as Element | null)?.matches?.(':focus-visible')) show(e.target, 0)
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', out)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', hide)
    document.addEventListener('pointerdown', hide)
    window.addEventListener('scroll', hide, true)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('pointerdown', hide)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('keydown', esc)
    }
  }, [])

  return (
    <>
      <div className={'site-load is-' + bar} aria-hidden="true">
        <span />
      </div>
      {tip && (
        <span
          className={'site-tip' + (tip.below ? ' is-below' : ' is-above')}
          role="tooltip"
          style={{ left: Math.min(Math.max(tip.x, 90), window.innerWidth - 90), top: tip.y }}
        >
          {tip.label}
        </span>
      )}
    </>
  )
}
