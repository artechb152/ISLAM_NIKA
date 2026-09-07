'use client'

/* THE END OF THE JEWISH TRIBES OF THE HIJAZ — A FULL-SCREEN JOURNEY OVER ONE MAP.

   §41–§46 are fourteen paragraphs the reader meets in a row and cannot hold:
   three tribe names, two destinations, two years, a conquest, a banner, a
   captive and a poisoned goat. They are also the one place in this chapter
   where geography IS the argument, and the running text hides it completely —
   BANU NADIR WERE EXPELLED TO KHAYBAR, and Khaybar is where, twelve years
   later, it ended. The source says both sentences three paragraphs apart.

   WHY A STAGE AND NOT PINS. This was first built as chapter 6's hajj map:
   pins on a picture inside the column, a bubble beside each. It failed for a
   reason worth writing down — the map was one more object in a section that
   still had fourteen paragraphs under it, so the reader had a map AND a wall.
   The stage replaces the text instead of illustrating it: the paragraphs are
   the only thing on the screen, and the ground they are read on is the ground
   they happened on.

   A CLICK-AND-ZOOM VERSION WAS BUILT AND REJECTED. The map rested whole, a
   press opened a full-screen layer and flew the camera in. It solved one real
   thing — the reader saw all four places at once — and cost the continuity
   that makes this section land: four separate visits instead of one movement
   north and back. The scroll is the mechanism.

   THE MAP IS PAINTED AT DUSK. It began as the daylight map and the paragraphs
   were maroon on a cream wash over it; the wash had to be so heavy to carry
   dark type that the map underneath went to a ghost. Darkening the painting
   inverts the problem — cream type on a dark ground needs a light scrim, not
   an opaque one, so the map stays a map and the words get bigger.

   A MOVING CAMERA, AND THREE DEPTHS OF PICTURE. Each step names a point, a
   zoom, and — from the fifth step on — a PAINTING. The first four ride the
   map; then the map gives way to the forts of Khaybar at a nearer remove, and
   that gives way to the people in the camp, nearer still. Every scene was
   painted in daylight and then put through the same dusk grade as the map, so
   the palette is one palette and the swap does not announce itself.

   THE SWAP IS A ZOOM, NOT A DISSOLVE, AND THAT COST A REWRITE. The first
   version gave all the layers ONE camera, so the shared scale had to fall
   from the map's 1.95 to the fort scene's own — and the picture pulled BACK
   at the exact moment it changed. Fading between two paintings while the
   camera retreats reads as a cut however smooth the fade is.

   Now every layer has its own scale. Through a swap the outgoing painting
   goes on pushing in (`z → z·K`) as it fades, and the incoming one starts
   short of its mark (`z/K`) and settles onto it as it arrives. Both are
   growing, in the same direction, at the same moment — which is the whole
   trick: the eye reads one continuous descent and never sees a boundary. `K`
   is the distance each layer travels through the handover, and no layer is
   ever allowed below a scale of 1, because that is what would expose an edge.

   `transform-origin` and `scale` and nothing else: a scale of 1 or more about
   ANY origin can never expose an empty edge, which is why the camera is built
   this way rather than out of translations that would need clamping.

   THE MARKER COUNTER-SCALES. It rides inside the frame so it stays glued to
   its place on the painting, and takes `scale(1/z)` so it is the same size on
   screen at every zoom.

   NOTHING IS PAINTED INTO THE MAP. Every name is DOM text — the rule chapter
   6's committee set for the hajj map: an image model invents Arabic script,
   and a painted label cannot be read aloud, translated, searched or focused.

   PURE FUNCTION OF SCROLL POSITION, so it rewinds exactly. Under reduced
   motion the transition is instantaneous and the camera simply sits on the
   active step's target. */

import { Scrolly, clamp01, lerp, seg, type ScrollyState } from '@/components/chapter6/scrolly'
import type { ReactNode } from 'react'

/** the painting the first four steps ride on */
const MAP = 'hijaz-map-night.webp'

/** how far each painting travels through a handover. Big enough that both
    layers are visibly moving in the same direction, small enough that the
    incoming one never has to start below a scale of 1. */
const K = 1.7

export interface StageShot {
  /** the point on the painted map the camera holds, in per-cent of the image */
  x: number
  y: number
  z: number
  /** the step's heading in the reading column — it names the EPISODE */
  head: string
  /** the painting this step is seen on. Absent means the map. */
  img?: string
  /** the marker on the map — it names the PLACE. The two are deliberately
      different words: „בני נדיר · 625" is what happened, „ח'יבר" is where, and
      the same `place` appearing twice on two different steps is the whole
      point of the section. */
  place?: string
}

export default function TribesStage({
  shots,
  steps,
}: {
  shots: StageShot[]
  steps: ReactNode[]
}) {
  return (
    <Scrolly full art={(s) => <Camera shots={shots} s={s} />}>
      {steps.map((node, i) => (
        <div key={i}>
          <h3 className="ch4-stage-head">{shots[i].head}</h3>
          {node}
        </div>
      ))}
    </Scrolly>
  )
}

function Camera({ shots, s }: { shots: StageShot[]; s: ScrollyState }) {
  const i = Math.min(s.step, shots.length - 1)
  const a = shots[i]
  const b = shots[Math.min(i + 1, shots.length - 1)]
  /* THE CAMERA HOLDS, THEN MOVES. `t` runs 0→1 from one paragraph's top to the
     next one's, so a paragraph sitting at the reading line is already near
     t≈0.6 — interpolating straight off `t` had the camera leaving Qaynuqa
     before the sentence about Qaynuqa had been read, and the marker on screen
     was always the NEXT place. The move is pushed into the last 45% of the
     step: the camera rests on the place for as long as its words are being
     read, and travels while the reader is between paragraphs. */
  const m = seg(clamp01(s.t), 0.55, 1)
  const ease = m * m * (3 - 2 * m)
  const shown = m < 0.5 ? a : b

  const layers = [MAP, ...new Set(shots.map((sh) => sh.img).filter(Boolean) as string[])]
  const srcOf = (sh: StageShot): string => sh.img ?? MAP
  const swapping = srcOf(a) !== srcOf(b)

  /* the fade is held to the middle of the move, so each painting is alone on
     the screen while its own words are being read and the two only overlap
     while the camera is travelling */
  const f = seg(ease, 0.22, 0.78)
  const fade = f * f * (3 - 2 * f)

  function layerState(src: string): { style: React.CSSProperties } {
    /* the two steps share a painting: one camera, straight through */
    if (!swapping) {
      const on = srcOf(a) === src
      return {
        style: {
          opacity: on ? 1 : 0,
          transformOrigin: `${lerp(a.x, b.x, ease)}% ${lerp(a.y, b.y, ease)}%`,
          transform: `scale(${Math.max(1, lerp(a.z, b.z, ease))})`,
        },
      }
    }
    if (srcOf(a) === src) {
      /* outgoing — goes on pushing in as it leaves */
      return {
        style: {
          opacity: 1 - fade,
          transformOrigin: `${a.x}% ${a.y}%`,
          transform: `scale(${Math.max(1, lerp(a.z, a.z * K, ease))})`,
        },
      }
    }
    if (srcOf(b) === src) {
      /* incoming — arrives short of its mark and settles onto it */
      return {
        style: {
          opacity: fade,
          transformOrigin: `${b.x}% ${b.y}%`,
          transform: `scale(${Math.max(1, lerp(b.z / K, b.z, ease))})`,
        },
      }
    }
    return { style: { opacity: 0 } }
  }

  /* the markers ride the layer the map is on, so they stay glued to the
     painting they belong to */
  const mapState = layerState(MAP)
  const heldZ = swapping ? a.z : Math.max(1, lerp(a.z, b.z, ease))

  return (
    <div className="ch4-stage">
      {/* THE SCRIM SITS BETWEEN THE PAINTINGS AND THE MARKERS: over the
          picture, so the type is readable on it, and under the markers, so a
          marker is not washed out by the very scrim that makes the words
          legible. */}
      <div className="ch4-stage-layers">
        {layers.map((src) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            className="ch4-stage-map"
            src={`/assets/chapter4/${src}`}
            alt={src === MAP ? "מפה מצוירת של צפון החיג'אז — מדינה, ח'יבר והדרך צפונה" : ''}
            aria-hidden={src === MAP ? undefined : true}
            style={layerState(src).style}
          />
        ))}
      </div>
      <span className="ch4-stage-veil" />
      <div className="ch4-stage-frame ch4-stage-marks" style={{ ...mapState.style, opacity: undefined }}>
        {shots.map((sh, k) =>
          sh.place ? (
            <span
              key={k}
              className={'ch4-stage-pin' + (shown === sh ? ' is-on' : '')}
              style={{
                left: `${sh.x}%`,
                top: `${sh.y}%`,
                transform: `translate(-50%,-50%) scale(${1 / heldZ})`,
              }}
            >
              <span className="ch4-stage-dot" />
              <span className="ch4-stage-label">{sh.place}</span>
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}
