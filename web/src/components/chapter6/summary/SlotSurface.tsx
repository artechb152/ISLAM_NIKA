'use client'

/* The one engine behind all five exercises: numbered empty slots on an illustrated surface,
   and a label goes into each one. What differs between the five is the SHAPE the slots make.

     row      three situations straight across — they are not a sequence, so nothing implies one
     arc      five prayers over a day, rising and setting, which is the shape of a day
     line     a required sequence, so a line with a connector and arrows
     map      pins on geography, because the journey is a place and not only an order
     sentence the beats: one or two gaps inside a sentence quoted from the chapter

   THE PARTS ARE THE ARTICLE'S PARTS. A slot is a gold-ringed numbered medallion (the chapter's
   `.rm-tl-med` timeline node), a mihrab-arched photograph with its caption BELOW the frame
   (`.rm-day-arch` + `.rm-day-title`), and a rule that fills. Nothing is boxed. On the map the
   pins are the chapter's own `.hjm-dot` / `.hjm-plabel`.

   A slot is never empty of INFORMATION: every one carries its number and, wherever the source
   gives one, a photograph or a printed cue. That is the difference between this and the version
   that showed forty blank squares — nothing here asks the reader to recall something that is
   not on the screen.

   A filled slot stops being a drop target: the caller stops passing `slotProps`, so
   usePickPlace's elementFromPoint cannot find it and no refusal can ever fire on it. A LOCKED
   slot never was one, and prints its own reason for being locked. */

import type { Layout, SlotDef } from '@/lib/chapter6/summary-data'

export interface SurfaceProps {
  layout: Layout
  slots: SlotDef[]
  /* map layout: the painting under the pins */
  surface?: string
  /* sentence layout: [1] and [2] mark the gaps */
  sentence?: string
  /* n → the label sitting in that slot */
  filled: Record<number, string>
  /* true where any label may go in any slot — the medallions then carry no digit, because a
     number on each one is a promise of an order the exercise does not have */
  anyOrder?: boolean
  slotIdFor: (n: number) => string
  /* omitted for a slot that is already full — that is what makes it stop being a target */
  slotPropsFor?: (n: number) => Record<string, unknown> | undefined
  refused?: string | null
  numbersAreOrder: boolean
}

function Slot({
  slot,
  label,
  props,
  refused,
  photoWhen,
  numbersAreOrder,
  anyOrder,
  style,
}: {
  slot: SlotDef
  label?: string
  props?: Record<string, unknown>
  refused?: boolean
  photoWhen: 'always' | 'onFill'
  numbersAreOrder: boolean
  anyOrder?: boolean
  style?: React.CSSProperties
}) {
  const locked = !!slot.locked
  const full = !!label || locked
  const showPhoto = !!slot.photo && (photoWhen === 'always' || !!label)
  const ordinal = numbersAreOrder ? `שלב ${slot.n}` : `משבצת ${slot.n}`
  return (
    <button
      type="button"
      className={
        'gv-slot' +
        (full ? ' is-full' : ' is-empty') +
        (locked ? ' is-locked' : '') +
        (refused ? ' is-refused' : '')
      }
      style={style}
      data-n={slot.n}
      aria-label={
        locked
          ? `${slot.locked} — משבצת נעולה`
          : `${ordinal}${slot.cue ? ` · ${slot.cue}` : ''} — ${label ?? 'ריקה'}`
      }
      aria-disabled={props ? undefined : true}
      {...(props ?? {})}
    >
      {slot.n > 0 && (
        <span className={'gv-slot-n' + (anyOrder ? ' is-blank' : '')} aria-hidden="true">
          {anyOrder ? '' : slot.n}
        </span>
      )}
      {showPhoto && (
        <span className="gv-slot-photo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/assets/chapter6/${slot.photo}`} alt="" loading="lazy" decoding="async" />
        </span>
      )}
      {slot.cue && (
        <span className="gv-slot-cue" aria-hidden="true">
          {slot.cue}
        </span>
      )}
      <span className="gv-slot-line" aria-hidden="true">
        {locked ? slot.locked : (label ?? '')}
      </span>
    </button>
  )
}

export default function SlotSurface(p: SurfaceProps) {
  const photoWhen: 'always' | 'onFill' = p.layout === 'map' ? 'onFill' : 'always'

  const render = (slot: SlotDef, style?: React.CSSProperties) => {
    const id = p.slotIdFor(slot.n)
    return (
      <Slot
        key={slot.n}
        slot={slot}
        label={p.filled[slot.n]}
        props={slot.locked || p.filled[slot.n] ? undefined : p.slotPropsFor?.(slot.n)}
        refused={p.refused === id}
        photoWhen={photoWhen}
        numbersAreOrder={p.numbersAreOrder}
        anyOrder={p.anyOrder}
        style={style}
      />
    )
  }

  if (p.layout === 'map') {
    /* THE MAP AND NOTHING ELSE. A strip of the stations' photographs used to grow underneath
       it as each one was named. Three of the seven hajj stops happen at the sanctuary, so it
       showed the Kaaba three times over — near-identical pictures side by side, captioned
       differently, which is worse than no picture at all. The painting already draws every
       one of these places. */
    return (
      /* the wrapper scrolls. The coordinates are the article's and do not move, so on a narrow
         screen the painting has to grow instead — below about 900px two of the article's pins
         („טוואף“ and „סעי“, four per cent apart) close to within a dot's width of each other
         and one swallows the other's clicks. Measured, not guessed. */
      <div className="gv-surface gv-mapwrap">
        <div className="gv-map">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="gv-map-img" src={`/assets/chapter6/${p.surface}`} alt="" />
          <div className="gv-map-pins">
            {/* PHYSICAL `left`, not `inset-inline-start`: the coordinates are the article's,
                measured from the left edge of the painting, and this page is RTL — a logical
                property would mirror every pin onto the wrong side of the map. */}
            {p.slots.map((s) => render(s, { left: `${s.x}%`, top: `${s.y}%` }))}
          </div>
        </div>
      </div>
    )
  }

  if (p.layout === 'sentence') {
    /* the sentence is split on its [n] markers and the slots are dropped back in where the
       source's own words were removed */
    const parts = (p.sentence ?? '').split(/(\[\d\])/g)
    return (
      <div className="gv-surface gv-sentence">
        <p className="gv-sentence-text">
          {parts.map((part, i) => {
            const m = /^\[(\d)\]$/.exec(part)
            const slot = m ? p.slots.find((s) => s.n === Number(m[1])) : undefined
            /* the wrapper carries the key. Without it the slot's own key (its NUMBER) collided
               with a plain part's key (its INDEX) — „[1]“ at index 2 and slot 2 both keyed „2“,
               and React quietly dropped one of them. */
            return <span key={`p${i}`}>{slot ? render(slot) : part}</span>
          })}
        </p>
      </div>
    )
  }

  /* row and line are ONE track on one hairline — the article's `.rm-tl-axis`. The line adds
     direction arrows because its order is the thing being tested; a row gets none, because
     its items are not a sequence and nothing should suggest they are.
     `--gv-cols` is written here rather than guessed in CSS: the row serves three situations
     in one exercise and five prayers in another.

     `is-bare` marks a track whose slots carry neither a photograph nor a printed cue — the
     charity vessels are the only one. It is not a guess in the stylesheet: the flag is read
     off the slots themselves, so adding a picture to that exercise would drop it. */
  const bare = p.slots.every((s) => !s.photo && !s.cue)
  return (
    <div
      className={'gv-surface gv-' + p.layout + (bare ? ' is-bare' : '')}
      style={{ '--gv-cols': p.slots.length } as React.CSSProperties}
    >
      <div className="gv-track">{p.slots.map((s) => render(s))}</div>
    </div>
  )
}
