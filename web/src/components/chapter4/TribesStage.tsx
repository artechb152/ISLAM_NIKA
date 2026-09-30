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

   THE SHOT'S x/y ARE A POINT ON THE PAINTING, NOT ON THE SCREEN. Each
   painting is laid out at its own proportions over the stage (the cover box,
   wider than a phone), and the camera is a scale plus a translation clamped so
   no edge ever shows. The first build scaled a `cover`-cropped <img> about
   x%/y% of the STAGE: right on a desktop, where the stage is nearly the map's
   shape, and wrong on a phone, where the crop is a third of the map wide — the
   Khaybar pin marked the caravan track, and „דרום סוריה" the middle of it.

   ON A NARROW SCREEN THE CAMERA HOLDS ITS POINT HIGH. On a desktop the words
   sit at the reading edge and the point stays where the painting has it; below
   920px the card spans the width and is read across the middle, so the point
   is brought to the upper quarter — otherwise „מדינה" sat under the heading.

   THE MARKER IS PLACED, NOT SCALED. Its screen position is computed from the
   map's camera, so it stays glued to its place at one size at every zoom.

   NOTHING IS PAINTED INTO THE MAP. Every name is DOM text — the rule chapter
   6's committee set for the hajj map: an image model invents Arabic script,
   and a painted label cannot be read aloud, translated, searched or focused.

   PURE FUNCTION OF SCROLL POSITION, so it rewinds exactly. Under reduced
   motion the transition is instantaneous and the camera simply sits on the
   active step's target. */

import { Scrolly, clamp01, lerp, seg, type ScrollyState } from '@/components/chapter6/scrolly'
import { useEffect, useRef, useState, type ReactNode } from 'react'

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

/** each painting's own width over height — the cover box is computed from it */
const ASPECT: Record<string, number> = {
  'hijaz-map-night.webp': 1600 / 1063,
  'khaybar-forts.webp': 1600 / 905,
  'khaybar-people.webp': 1600 / 905,
}
const aspectOf = (src: string): number => {
  const a = ASPECT[src]
  if (!a) throw new Error(`chapter 4 stage: no aspect for ${src}`)
  return a
}

/** below this the stage card spans the width (the shared sheet's 920) */
const NARROW = 920
/** where a narrow screen holds the camera's point, as a fraction of the height */
const HOLD_Y = 0.24

/** the painting laid out to cover the stage, in stage fractions */
interface Box {
  x0: number
  y0: number
  w: number
  h: number
}
function coverBox(imageAspect: number, stageAspect: number): Box {
  if (stageAspect < imageAspect) {
    const w = imageAspect / stageAspect
    return { x0: (1 - w) / 2, y0: 0, w, h: 1 }
  }
  const h = stageAspect / imageAspect
  return { x0: 0, y0: (1 - h) / 2, w: 1, h }
}

interface Cam {
  box: Box
  /** the shot's point, in stage fractions */
  px: number
  py: number
  z: number
  /** where that point lands on screen, in stage fractions */
  tx: number
  ty: number
}

/** the range a point may be held at without the painting's edge entering */
const hold = (want: number, p: number, lo: number, len: number, z: number): number =>
  Math.min(z * (p - lo), Math.max(1 - z * (lo + len - p), want))

const pct = (v: number): string => `${(v * 100).toFixed(3)}%`

function Camera({ shots, s }: { shots: StageShot[]; s: ScrollyState }) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  /* before the first measure (and on the server) assume a desktop stage */
  const stageAspect = size.h ? size.w / size.h : 1.35
  const narrow = size.w > 0 && size.w <= NARROW

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

  /** a shot seen on its painting: the point in stage fractions, and where the
      camera wants it on screen before clamping */
  const aim = (sh: StageShot) => {
    const box = coverBox(aspectOf(srcOf(sh)), stageAspect)
    const px = box.x0 + (sh.x / 100) * box.w
    const py = box.y0 + (sh.y / 100) * box.h
    return { box, px, py, wx: narrow ? 0.5 : px, wy: narrow ? HOLD_Y : py }
  }
  const cam = (box: Box, px: number, py: number, z: number, wx: number, wy: number): Cam => ({
    box,
    px,
    py,
    z,
    tx: hold(wx, px, box.x0, box.w, z),
    ty: hold(wy, py, box.y0, box.h, z),
  })

  /* the camera for a layer, or null when the layer is not on screen */
  function cameraFor(src: string): { c: Cam; opacity: number } | null {
    const A = aim(a)
    const B = aim(b)
    /* the two steps share a painting: one camera, straight through */
    if (!swapping) {
      if (srcOf(a) !== src) return null
      const z = Math.max(1, lerp(a.z, b.z, ease))
      return {
        c: cam(A.box, lerp(A.px, B.px, ease), lerp(A.py, B.py, ease), z, lerp(A.wx, B.wx, ease), lerp(A.wy, B.wy, ease)),
        opacity: 1,
      }
    }
    /* outgoing — goes on pushing in as it leaves */
    if (srcOf(a) === src) {
      return { c: cam(A.box, A.px, A.py, Math.max(1, lerp(a.z, a.z * K, ease)), A.wx, A.wy), opacity: 1 - fade }
    }
    /* incoming — arrives short of its mark and settles onto it */
    if (srcOf(b) === src) {
      return { c: cam(B.box, B.px, B.py, Math.max(1, lerp(b.z / K, b.z, ease)), B.wx, B.wy), opacity: fade }
    }
    return null
  }

  /* screen = held point + zoom × distance from the point; the translation is a
     percentage of the element's own box, hence the division */
  function layerStyle(src: string): React.CSSProperties {
    const v = cameraFor(src)
    if (!v) return { opacity: 0 }
    const { box, px, py, z, tx, ty } = v.c
    const dx = tx - box.x0 - z * (px - box.x0)
    const dy = ty - box.y0 - z * (py - box.y0)
    return {
      left: pct(box.x0),
      top: pct(box.y0),
      width: pct(box.w),
      height: pct(box.h),
      opacity: Number(v.opacity.toFixed(4)),
      transform: `translate(${pct(dx / box.w)},${pct(dy / box.h)}) scale(${z.toFixed(4)})`,
    }
  }

  /* the markers ride the map's camera */
  const mapCam = cameraFor(MAP)?.c ?? null

  return (
    <div className="ch4-stage" ref={stageRef}>
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
            style={layerStyle(src)}
          />
        ))}
      </div>
      <span className="ch4-stage-veil" />
      <div className="ch4-stage-marks">
        {mapCam &&
          shots.map((sh, k) => {
            if (!sh.place || sh.img) return null
            const q = aim(sh)
            return (
              <span
                key={k}
                className={'ch4-stage-pin' + (shown === sh ? ' is-on' : '')}
                style={{
                  left: pct(mapCam.tx + mapCam.z * (q.px - mapCam.px)),
                  top: pct(mapCam.ty + mapCam.z * (q.py - mapCam.py)),
                }}
              >
                <span className="ch4-stage-dot" />
                <span className="ch4-stage-label">{sh.place}</span>
              </span>
            )
          })}
      </div>
    </div>
  )
}
