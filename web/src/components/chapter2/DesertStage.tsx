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
  /** A LINE HELD ABOVE THE BEAT WHILE ITS ITEMS CHANGE UNDER IT.
      „האקלים התאפיין ב:" introduces four items, and the whole point of this
      device is that each item gets its own picture — heat, cold, dust. Printed
      once on the first beat and then gone, it left a reader on beat 3 looking
      at „קור עז בלילה." with no verb and no antecedent anywhere on the screen.
      Held, the sentence stays and the item under it changes, which is exactly
      what the scarcity beat does in one screen and what the source's own colon
      asks for. It is the same fragment, not a repeated one: §9.b is consumed
      once, by this slot. */
  lead?: string
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
/* §10.a ALONE, and this is the hierarchy fix. The lead used to be
   `['§9.dry', '§10.a']` — the last two items of the CLIMATE list („יובש.
   צחיחות.") glued to the sentence that opens a different subject entirely, the
   desert as a dangerous place. One beat held the end of one list and the start
   of the next idea, so neither read as what it is. יובש and צחיחות close their
   own list on their own beat now. */
const DANGER_LEAD = ['§10.a']
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

/* TEN BEATS, AND THE COUNT IS NOT THE POINT — THE DIVISION IS.
   Seven beats carried the source unevenly: six of them held one or two
   fragments and the last held FIVE — the scarcity lead, its three items, the
   wars that followed, the endurance that followed those, and the gloss that
   defines it. On screen that is a wall of display type under a photograph, and
   the reader has no way to stop anywhere inside it.

   The source's own hierarchy is three-deep, and the beats now follow it:
     a claim                — תנאי החיים היו קשים ביותר
     a lead and its items   — האקלים התאפיין ב: חום · קור · יובש וצחיחות
     what came of it        — מלחמות, ואז הצבר

   So: the climate list closes on its own beat, the danger sentence keeps its
   three-click reveal, scarcity holds its lead with its items, the war those
   caused takes its own beat, and the endurance — the sentence the whole section
   is walking toward — stands last, with its gloss under it and nothing else.

   THE WAR SENTENCE IS ITS OWN BEAT, and that is a hierarchy fix rather than a
   volume one. Held with the scarcity lead and its items it made a sandwich:
   display type, three small lines, display type again, so the eye read the
   items as an interruption of one sentence rather than as the list of the one
   above them. A list belongs to the line that introduces it and to nothing
   else. */
const STEPS: Step[] = [
  { refs: ['§9.a'], frame: 'desert-1.jpg', scene: 'העמק באור ראשון' },
  { lead: '§9.b', refs: ['§9.day'], frame: 'desert-2.jpg', scene: 'אותו עמק בשיא החום' },
  { lead: '§9.b', refs: ['§9.night'], frame: 'desert-3.jpg', scene: 'אותו עמק בלילה, כפור על האבנים' },
  { lead: '§9.b', refs: ['§9.dry'], frame: 'desert-4.jpg', scene: 'אותו עמק ביובש ובאבק' },
  { refs: DANGER_LEAD, frame: 'desert-6.jpg', reveal: 1, scene: 'העמק בדמדומים — מרחב מסוכן' },
  { refs: DANGER_LEAD, frame: 'desert-6.jpg', reveal: 2, figures: ['beasts'], scene: 'זאב וצבוע נכנסים לעמק מימין' },
  {
    refs: DANGER_LEAD,
    frame: 'desert-6.jpg',
    reveal: 3,
    figures: ['beasts', 'raiders'],
    scene: 'שני שודדים רכובים נכנסים לעמק משמאל',
  },
  { refs: ['§11.a', '§11.list'], frame: 'desert-7.jpg', scene: 'שלולית מכווצת, רצועת מרעה וכתם שדה — כל המשאבים שיש' },
  { refs: ['§11.b'], frame: 'desert-7.jpg', scene: 'אותו מקום, ועליו נלחמים' },
  {
    refs: ['§12.a', '§12.gloss'],
    frame: 'desert-5.jpg',
    scene: 'נוסע יחיד בנחל האכזב — החוסן שנולד מן המקום',
  },
]

/* The three danger beats share desert-4. Stack each frame ONCE: a duplicated
   layer both cross-fades against its own twin and — because the copies sat
   `hidden` with loading="lazy" — never decoded at all, which read to the audit
   as an image that failed to load. */
const FRAMES: string[] = [...new Set(STEPS.map((s) => s.frame))]

/* THE BEAT HAS THREE VOICES, AND THEY ARE READ OFF THE SOURCE, NOT AUTHORED.
   Everything used to be joined with spaces into one run of display type, so
   „גם המשאבים היו מועטים:" and „מים. שטחי מרעה. שדות חקלאיים." and „אורך רוח
   ויכולת לשאת סבל." all arrived in the same size and weight — a colon in the
   middle of a paragraph, three two-word sentences reading as a stutter, and a
   definition indistinguishable from the sentence it defines.

   A fragment declared `list` in passages.json is a list and takes one line per
   item. A fragment whose id is `gloss` is a gloss and is set as one. Everything
   else is the sentence. No fragment is ROLED here by hand — the kinds come from
   the data, which is the same rule the article body follows. */
type Kind = 'say' | 'items' | 'note'
interface Piece {
  kind: Kind
  text?: string
  items?: string[]
}
const pieces = (s: Step): Piece[] => {
  const out: Piece[] = []
  for (const r of s.refs) {
    if (frag(r).list) {
      out.push({ kind: 'items', items: list(r) })
      continue
    }
    const kind: Kind = r.endsWith('.gloss') ? 'note' : 'say'
    const prev = out[out.length - 1]
    /* two plain sentences in one beat are one paragraph, as they are in the
       article — „תנאי החיים היו קשים ביותר. האקלים התאפיין ב:" is one thought */
    if (kind === 'say' && prev?.kind === 'say') prev.text = `${prev.text} ${text(r)}`
    else out.push({ kind, text: text(r) })
  }
  return out
}

/** the beat's text: its pieces in order, the last of them carrying the danger
    sentence as far as it has been written on this beat */
function Said({ step }: { step: Step }) {
  const ps = pieces(step)
  /* where the items ARE the beat — no sentence beside them, only the held lead
     above — they carry the voice of a sentence rather than of a caption */
  const alone = !ps.some((p) => p.kind === 'say')
  return (
    <>
      {step.lead ? <span className="ch2-stage-lead">{text(step.lead)} </span> : null}
      {ps.map((p, n) => {
        if (p.kind === 'items') {
          return (
            /* the space after each item is collapsed away between two blocks
               and never seen, and it is why `textContent` reads „יובש. צחיחות."
               as two words rather than one fused token — the chapter's search
               and the audit's counts both read this text, exactly as they do
               the article's own lists */
            <span className={'ch2-stage-items' + (alone ? ' is-alone' : '')} key={n}>
              {p.items!.map((item) => (
                <span className="ch2-stage-item" key={item}>
                  {item}{' '}
                </span>
              ))}
            </span>
          )
        }
        const last = n === ps.length - 1
        return (
          <span className={p.kind === 'note' ? 'ch2-stage-note' : 'ch2-stage-say'} key={n}>
            {/* the same separator the items carry, for the same reason: without
                it „…שהתבטא בצבר." and „אורך רוח…" fuse into one token for every
                reader of `textContent` — the chapter's search and the gates */}
            {n ? ' ' : null}
            {p.text}
            {last && step.reveal ? (
              <>
                {' '}
                {DANGER_PARTS[0]}
                {step.reveal >= 2 && <b className="ch2-stage-lit">{DANGER_PARTS[1]}</b>}
                {step.reveal >= 3 && <b className="ch2-stage-lit">{DANGER_PARTS[2]}</b>}
              </>
            ) : null}
          </span>
        )
      })}
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
      /* THE ARROWS AND NOT THE PAGING KEYS. A focused widget owning the arrow
         keys is conventional; owning PageDown is not. A reader who merely
         CLICKED the scene with a mouse — which focuses the advance button —
         found that PageDown no longer scrolled the article, it advanced the
         beat. This component's own contract is that the page never scroll-jacks,
         and swallowing the paging keys is the same thing by another route. */
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); move(-1) }
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

        {/* BOTH ARROWS CARRY aria-disabled AND NOT disabled — the same trap the
            scene button was fixed for, and these two were left in it. A disabled
            button drops focus: reaching the last beat from the forward arrow
            emptied document.activeElement, the key handler's containment check
            stopped matching, and the arrows and Home died with no way back.
            `move()` already clamps, so a click at either bound does nothing. */}
        <div className="ch2-stage-controls">
          <button
            type="button"
            className="ch2-stage-btn"
            onClick={(e) => { e.stopPropagation(); move(-1) }}
            aria-disabled={i === 0 || undefined}
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
            aria-disabled={last || undefined}
            aria-label="קדימה"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>

        </div>

        {/* The invitation, on a LINE OF ITS OWN under the controls.

            It used to ride the control row. Inside that row it did two things
            wrong at once. Unmounted when taken, it made the row shorter on a
            narrow screen — the row wraps there, so the hint held a line — and
            since the copy block is vertically centred the controls jumped 20px
            on the reader's very first click. Kept in place but hidden, its box
            still sat at one END of the row, so the arrows and dots were pushed
            off the centre the sentence above them is centred on.

            On its own centred line it does neither: the control row holds only
            the arrows and the dots and centres on the same axis as the text, and
            this line's box is reserved whether the hint is showing or not. */}
        <span
          className={'ch2-stage-hint' + (touched ? ' is-taken' : '')}
          aria-hidden="true"
        >
          לחצו כדי להמשיך
        </span>
      </div>
    </div>
  )
}
