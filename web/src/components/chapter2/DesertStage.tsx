'use client'

/* תנאי החיים במדבר — the chapter's one full-screen device.

   Chapter 6 drives its immersive scene with scroll. This one is driven by a
   CLICK, which is the better fit for what the source actually says: the desert
   section is not a continuous journey, it is a set of NAMED conditions of one
   place — heat, cold, drought, danger, scarcity, and the endurance those
   produced. A reader should be able to sit on "קור עז בלילה" for as long as
   they like, which a scroll position cannot offer.

   Five frames of ONE composition (same ridge, same thorn bush, same wash, same
   range) so moving between them reads as the place changing rather than as a
   slideshow of different places.

   THE DANGER BEAT. §10.b names two dangers in one sentence — חיות טרף ומשודדים.
   It is held across three clicks: the sentence alone, then the predators walk
   into the RIGHT of the same frame, then the raiders into the LEFT. The words
   light up as their figure arrives, so the sentence is never cut in half and
   never repeated: one paragraph, revealed in the order it is written.

   Rules this component keeps:
     · it writes no sentence — every string arrives by §N.fragment
     · the page never scroll-jacks: this is an ordinary block in the flow, and
       scrolling past it works exactly as it does anywhere else
     · click, arrow keys, and real buttons all do the same thing
     · under prefers-reduced-motion the frames and figures swap instantly */

import { useCallback, useEffect, useRef, useState } from 'react'
import { frag, list, text } from '@/lib/chapter2/content'

const A = '/assets/chapter2/'

type Figure = 'beasts' | 'raiders'

interface Step {
  /** the source fragments this beat carries, in order */
  refs: string[]
  frame: string
  /** figures standing in the scene on this beat, cumulative */
  figures?: Figure[]
  /** how many clauses of the danger sentence are written yet (1, 2 or 3) */
  reveal?: 1 | 2 | 3
  /** What the frame shows. An ACCESSIBILITY LABEL — alt text and control labels
      have to be authored, but no sentence PRINTED on this page may be mine. */
  scene: string
}

/* §10.b names both dangers in one sentence:
     "בנוסף לקשיי האקלים, נשקפה סכנה מתמדת מחיות טרף ומשודדים."
   It is written across three clicks — the lead-in, then each danger as its
   figure walks into the valley. The split points are FOUND in the source string
   rather than typed out, so the sentence stays verbatim and an edit upstream
   throws here instead of silently truncating the text on screen. */
const DANGER_LEAD = ['§9.dry', '§10.a']
/* the מ is PART of the word: the source reads "מחיות טרף". Cutting at "חיות"
   ended the first beat on a stranded מ and painted half of one word maroon and
   half cream — the exact mid-sentence break this device exists to avoid. */
const BEASTS_WORDS = 'מחיות טרף'
const RAIDERS_WORDS = 'ומשודדים'
const DANGER_PARTS = (() => {
  const s = text('§10.b')
  const a = s.indexOf(BEASTS_WORDS)
  const b = s.indexOf(RAIDERS_WORDS)
  /* a split has to land on a WORD boundary, not merely somewhere in the string —
     "חיות טרף" was present and matched happily, one letter into a word. */
  const onBoundary = (i: number) => i === 0 || /[\s,.;:—"'„”]/.test(s[i - 1])
  if (a < 0 || b < 0 || b < a || !onBoundary(a) || !onBoundary(b)) {
    throw new Error(
      `chapter 2: §10.b must contain "${BEASTS_WORDS}" then "${RAIDERS_WORDS}", each at a word boundary — ${s}`,
    )
  }
  return [s.slice(0, a), s.slice(a, b), s.slice(b)]
})()

const STEPS: Step[] = [
  { refs: ['§9.a', '§9.b'], frame: 'desert-1.jpg', scene: 'העמק באור ראשון' },
  { refs: ['§9.day'], frame: 'desert-2.jpg', scene: 'אותו עמק בשיא החום' },
  { refs: ['§9.night'], frame: 'desert-3.jpg', scene: 'אותו עמק בלילה, כפור על האבנים' },
  { refs: DANGER_LEAD, frame: 'desert-4.jpg', reveal: 1, scene: 'אותו עמק ביובש ובאבק' },
  { refs: DANGER_LEAD, frame: 'desert-4.jpg', reveal: 2, figures: ['beasts'], scene: 'זאב וצבוע נכנסים לעמק מימין' },
  {
    refs: DANGER_LEAD,
    frame: 'desert-4.jpg',
    reveal: 3,
    figures: ['beasts', 'raiders'],
    scene: 'שני שודדים רכובים נכנסים לעמק משמאל',
  },
  {
    refs: ['§11.a', '§11.list', '§11.b', '§12.a', '§12.gloss'],
    frame: 'desert-5.jpg',
    scene: 'אותו עמק באור חוזר, ונוסע יחיד בנחל האכזב',
  },
]

/* The three danger beats share desert-4. Stack each frame ONCE: a duplicated
   layer both cross-fades against its own twin and — because the copies sat
   `hidden` with loading="lazy" — never decoded at all, which read to the audit
   as an image that failed to load. */
const FRAMES: string[] = [...new Set(STEPS.map((s) => s.frame))]

/** the fragments of a beat, joined into one paragraph */
const say = (s: Step): string =>
  s.refs.map((r) => (frag(r).list ? list(r).join(' ') : text(r))).join(' ')

/** the beat's text: the whole sentence, or the danger sentence written so far */
function Said({ step }: { step: Step }) {
  const lead = say(step)
  if (!step.reveal) return <>{lead}</>
  return (
    <>
      {lead} {DANGER_PARTS[0]}
      {step.reveal >= 2 && <b className="ch2-stage-lit">{DANGER_PARTS[1]}</b>}
      {step.reveal >= 3 && <b className="ch2-stage-lit">{DANGER_PARTS[2]}</b>}
    </>
  )
}

export default function DesertStage() {
  const [i, setI] = useState(0)
  const [touched, setTouched] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const clamp = (v: number) => Math.min(STEPS.length - 1, Math.max(0, v))
  /** jump to an absolute beat — what a dot does */
  const go = useCallback((next: number) => {
    setTouched(true)
    setI((cur) => (clamp(next) === cur ? cur : clamp(next)))
  }, [])
  /** move RELATIVE to wherever we are now.
      `go(i + 1)` reads `i` from the render that attached the handler, so several
      clicks inside one frame all computed the same target and forty rapid taps
      advanced the stage exactly one beat. Relative moves have to be derived
      inside the updater, from the current value. */
  const move = useCallback((delta: number) => {
    setTouched(true)
    setI((cur) => clamp(cur + delta))
  }, [])

  /* arrow keys only while the stage holds focus — never steal the page's
     keyboard. In RTL, "forward" is leftward. */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onKey = (e: KeyboardEvent) => {
      if (!root.contains(document.activeElement)) return
      if (e.key === 'ArrowLeft' || e.key === 'PageDown') { e.preventDefault(); move(1) }
      else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); move(-1) }
      else if (e.key === 'Home') { e.preventDefault(); go(0) }
      else if (e.key === 'End') { e.preventDefault(); go(STEPS.length - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, move])

  const last = i === STEPS.length - 1
  const step = STEPS[i]
  const figures = step.figures ?? []

  return (
    <div className="ch2-stage" ref={rootRef}>
      {/* the scene. Every frame is in the DOM from the start so a click never
          waits on a network request; only the active one is opaque. */}
      <div className="ch2-stage-scene" aria-hidden="true">
        {FRAMES.map((frame, n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={frame}
            src={A + frame}
            alt=""
            loading={n === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={frame === step.frame ? 'is-on' : undefined}
          />
        ))}
        {/* the two dangers, each entering from its own side of the same valley */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={'ch2-stage-figure is-beasts' + (figures.includes('beasts') ? ' is-in' : '')} src={A + 'beasts.webp'} alt="" loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={'ch2-stage-figure is-raiders' + (figures.includes('raiders') ? ' is-in' : '')} src={A + 'raiders.webp'} alt="" loading="lazy" />
        <span className="ch2-stage-veil" />
      </div>

      {/* the whole scene is the "next" control, with a real button underneath it
          for keyboard and assistive tech */}
      {/* aria-disabled, NOT disabled. A disabled button drops focus, so reaching
          the last beat with the keyboard emptied document.activeElement, the
          key handler's containment check stopped matching, and the reader could
          not get back out — Home and the arrows simply died. */}
      <button
        type="button"
        className="ch2-stage-advance"
        onClick={() => move(1)}
        aria-disabled={last || undefined}
        aria-label={last ? 'סוף' : `הבא: ${STEPS[i + 1].scene}`}
      />

      <div className="ch2-stage-copy">
        {/* the wrapper does the vertical centring. Putting `display:flex` on the
            paragraph itself turned every inline run into a flex item, so the two
            revealed clauses broke out of the line and stacked mid-sentence. */}
        <div className="ch2-stage-line">
          {/* THE SIZER. Every beat, rendered once, invisible, all of them in the
              same grid cell — so the box is always as tall as the LONGEST beat
              and the controls under it never move when the reader clicks.

              This box used to reserve its height with `min-height:6.2em`, which
              is a guess and not a measurement: the short beats fitted inside it
              and the long ones overflowed it, so the controls travelled 102px
              between the first beat and the last. Measured, that is what the
              reader saw as „it moves when you click".

              `visibility:hidden` and not `display:none`, because a box that is
              not laid out reserves nothing. `aria-hidden` because this is a
              layout device and not text — it also keeps the chapter's search out
              of it, which rejects any `[aria-hidden]` branch, so the sentences
              are not found five times over. */}
          {STEPS.map((s, n) => (
            <span className="ch2-stage-sizer" aria-hidden="true" key={n}>
              <Said step={s} />
            </span>
          ))}
          <p className="ch2-stage-said" aria-live="polite">
            <Said step={step} />
          </p>
        </div>

        <div className="ch2-stage-controls">
          <button
            type="button"
            className="ch2-stage-btn"
            onClick={(e) => { e.stopPropagation(); move(-1) }}
            disabled={i === 0}
            aria-label="אחורה"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>

          <ol className="ch2-stage-dots">
            {STEPS.map((s, n) => (
              <li key={s.scene}>
                <button
                  type="button"
                  className={n === i ? 'is-on' : undefined}
                  aria-current={n === i ? 'true' : undefined}
                  aria-label={s.scene}
                  onClick={(e) => { e.stopPropagation(); go(n) }}
                />
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="ch2-stage-btn"
            onClick={(e) => { e.stopPropagation(); move(1) }}
            disabled={last}
            aria-label="קדימה"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>

          {/* The invitation, shown until the reader takes it. It rides the
              control row rather than sitting under it, so it cannot fall below
              the fold on the one screen where it is the whole point.

              It is HIDDEN, never unmounted. On a narrow screen the control row
              wraps and the hint takes a line of its own, so dropping it out of
              the flow made the row shorter — and because the copy block is
              vertically centred, the controls jumped 20px on the reader's very
              first click. Measured on a 390px screen: 539 before, 559 after,
              and stable from then on. Keeping its box reserved costs one line of
              air below the controls and buys a row that never moves. */}
          <span
            className={'ch2-stage-hint' + (touched ? ' is-taken' : '')}
            aria-hidden="true"
          >
            לחצו כדי להמשיך
          </span>
        </div>
      </div>
    </div>
  )
}
