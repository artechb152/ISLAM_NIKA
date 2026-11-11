'use client'

/* מילון מונחים — פרק שבעה עשר בחוברת, 36 ערכים בסדר א-ב.
   כל ערך מודפס כפי שהוא ב-glossary.json (נבדק מילה במילה מול החוברת). הרכיב מוסיף
   רק שני דברים שאינם טקסט: קיבוץ לפי האות הראשונה, וסינון. */

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type UIEvent } from 'react'
import ReferenceShell, { REFERENCE_PAGES } from '@/components/reference/ReferenceShell'
import GLOSSARY from '@/lib/reference/glossary.json'

type Entry = { id: string; term: string; text: string }
const ENTRIES = GLOSSARY as Entry[]

/* ניקוד וגרש אינם חלק מהחיפוש: „אמאם" מוצא את „אָמאם", „גיהאד" את „ג'יהאד" */
const fold = (s: string) => s.replace(/[֑-ׇ]/g, '').replace(/['׳`"״]/g, '').toLowerCase()
const letterOf = (term: string) => fold(term).charAt(0)

export default function Glossary() {
  const [q, setQ] = useState('')
  const needle = fold(q.trim())
  /* the letter whose group is under the sticky bar — marked (aria-current) in the strip */
  const [inView, setInView] = useState<string | null>(null)
  const inlineLetters = useRef<HTMLElement | null>(null)
  const [fade, setFade] = useState({ start: false, end: true })

  /* מסך הפרקים שולח לכאן חיפוש שלא מצא פרק (‎/glossary?q=…‎) */
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('q')
      if (fromUrl) setQ(fromUrl)
    } catch {}
  }, [])

  const shown = useMemo(
    () => (needle ? ENTRIES.filter((e) => fold(e.term).includes(needle) || fold(e.text).includes(needle)) : ENTRIES),
    [needle]
  )

  /* האותיות נגזרות מהערכים, לא מהאלפבית — אין אות ריקה ברצועה */
  const allLetters = useMemo(() => [...new Set(ENTRIES.map((e) => letterOf(e.term)))], [])
  const groups = useMemo(() => {
    const by = new Map<string, Entry[]>()
    for (const e of shown) {
      const l = letterOf(e.term)
      by.set(l, [...(by.get(l) ?? []), e])
    }
    return [...by.entries()]
  }, [shown])

  /* which letter is being read: the group crossing a band just under the sticky bars */
  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('.ref-letter-group')]
    if (!nodes.length) {
      setInView(null)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setInView(e.target.id.replace(/^letter-/, ''))
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [groups])

  /* on the phone the strip is one row that scrolls sideways — an edge fades wherever more
     letters wait past it, and the letter in view is pulled into the row */
  const syncFade = (el: HTMLElement) => {
    const max = el.scrollWidth - el.clientWidth
    const at = Math.abs(el.scrollLeft) // RTL: 0 at the start (right), negative toward the left
    setFade({ start: max > 1 && at > 2, end: max > 1 && at < max - 2 })
  }
  useEffect(() => {
    const strip = inlineLetters.current
    if (!strip) return
    syncFade(strip)
    const cur = inView ? strip.querySelector<HTMLElement>(`[data-l="${inView}"]`) : null
    if (cur && strip.scrollWidth > strip.clientWidth) {
      const s = strip.getBoundingClientRect()
      const b = cur.getBoundingClientRect()
      if (b.left < s.left + 24 || b.right > s.right - 24) strip.scrollLeft += b.left + b.width / 2 - (s.left + s.width / 2)
    }
  }, [inView])

  /* קפיצה לאות בגלילה של החלון עצמו. עוגן רגיל גלל מכל עוטף חתוך במעטפת (ה-masthead
     ירד 74px והשאיר פס ריק מעליו), ונחת אות אחת לפני היעד. ההיסט הוא גובה הבאנר
     ופס החיפוש שבתוך הטור — שבמסך רחב אינו מוצג (גובהו 0), כי הכלים יושבים בסרגל. */
  const jump = (e: MouseEvent, l: string, close?: () => void) => {
    const el = document.getElementById(`letter-${l}`)
    const bar = document.querySelector('.ref-tools.is-inline')
    const head = document.querySelector('.chapter-site-header')
    if (!el) return
    e.preventDefault()
    close?.()
    const off = (head?.getBoundingClientRect().height ?? 0) + (bar?.getBoundingClientRect().height ?? 0) + 16
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' })
    history.replaceState(null, '', `#letter-${l}`)
  }

  /* הכלים נבנים פעמיים מאותו state: בסרגל (במקום רשימת העמודים) ובטור, ו-CSS מציג
     אחד מהם — סרגל מ-1024px, טור מתחתיו. */
  const tools = (where: 'is-rail' | 'is-inline', close?: () => void) => (
    <div className={`ref-tools ${where}`}>
      <label className="ref-search">
        <span className="ref-sr">חיפוש במילון</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש מונח או מילה בהגדרה"
          autoComplete="off"
        />
      </label>
      <p className="ref-count" aria-live="polite">
        {needle ? `${shown.length} מתוך ${ENTRIES.length}` : ' '}
      </p>
      <nav
        className={'ref-letters' + (where === 'is-inline' ? (fade.start ? ' fade-start' : '') + (fade.end ? ' fade-end' : '') : '')}
        aria-label="קפיצה לפי אות"
        ref={where === 'is-inline' ? inlineLetters : undefined}
        onScroll={where === 'is-inline' ? (e: UIEvent<HTMLElement>) => syncFade(e.currentTarget) : undefined}
      >
        {allLetters.map((l) => {
          const has = groups.some(([g]) => g === l)
          return has ? (
            <a
              key={l}
              data-l={l}
              href={`#letter-${l}`}
              className={inView === l ? 'is-current' : undefined}
              aria-current={inView === l ? 'true' : undefined}
              onClick={(e) => jump(e, l, close)}
            >
              {l}
            </a>
          ) : (
            <span key={l} aria-disabled="true">{l}</span>
          )
        })}
      </nav>
      {/* שורה שקטה אחת אל שלושת עמודי העזר האחרים — בסרגל בלבד, מתחת לאותיות
          (במילון הסרגל נושא את הכלים במקום רשימת העמודים; זו הדרך היחידה מכאן אליהם) */}
      {where === 'is-rail' && (
        <p className="ref-also">
          עוד בכלי העזר:{' '}
          {REFERENCE_PAGES.filter((p) => p.id !== 'glossary').map((p, i, all) => (
            <span key={p.id}>
              <Link href={p.href} onClick={close}>{p.title}</Link>
              {i < all.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  )

  return (
    <ReferenceShell
      current="glossary"
      eyebrow="מילון מונחים"
      title="מילון מונחים קצר"
      subtitle={`${ENTRIES.length} מונחים, לפי סדר א-ב`}
      rail={(close) => tools('is-rail', close)}
    >
      <section className="article-section ref-glossary" aria-label="המונחים">
        {tools('is-inline')}

        {groups.length === 0 && (
          <p className="ref-empty">
            אין מונח שמתאים לחיפוש.{' '}
            <button type="button" className="ref-link" onClick={() => setQ('')}>ניקוי החיפוש</button>
          </p>
        )}

        {groups.map(([letter, list]) => (
          <div className="ref-letter-group" id={`letter-${letter}`} key={letter}>
            <span className="ref-letter" aria-hidden="true">{letter}</span>
            <dl className="ref-entries">
              {list.map((e) => (
                <div className="ref-entry" id={e.id} key={e.id}>
                  <dt>{e.term}</dt>
                  <dd>{e.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>
    </ReferenceShell>
  )
}
