/* Which ground each region is played on.

   Chapter 1 is one continuous journey through nine regions, but the engine was
   written against a single hard-coded import of camp-layout.json — the camp was
   not "a region", it was "the world". This table is what turns that around: a
   region id maps to the layout its ground is built from, and everything the
   engine derives (prop placement, collision footprints, camel patrol routes,
   terrain) is derived per region from the layout named here.

   A layout round-trips through Blender: `npm run camp:export` writes the .blend,
   you move things visually, and `npm run camp:import` writes the JSON back. Model
   names inside the JSON map to GLB files by filename — a model that exists only
   in a layout needs no code change anywhere.

   Regions absent from this table have no ground authored yet. That is a normal
   state, not an error — the journey is being built one region at a time, and a
   region without a layout simply cannot be entered. */

import campLayout from './camp-layout.json'
import borderLayout from './border-layout.json'
import yathribLayout from './yathrib-layout.json'
import yemenLayout from './yemen-heights-layout.json'
import passLayout from './narrow-pass-layout.json'
import roadLayout from './loading-road-layout.json'
import monasteryLayout from './monastery-layout.json'
import meccaLayout from './mecca-layout.json'
import exitLayout from './exit-layout.json'

/* Declared rather than inferred (`typeof campLayout`), because two layout files
   never infer to the same literal type — one optional `role` on a single prop
   is enough to make them structurally incompatible. This is the shape the
   engine actually reads. */
export interface LayoutProp {
  model: string
  x: number
  z: number
  ry: number
  h: number
  r: number
  role?: string
  /** Warm-tint override for assets whose exported colour is off (grey stone in
      a beige world). Multiplies the texture, so relief survives. */
  tint?: string
  /** Metres to bury the base below ground — hides open cut edges on terrain
      undulation (ridges) and beds props into the sand. */
  sink?: number
  /** Stretch this prop across its own x only, leaving height alone. Authored
      for the border gate, whose modelled archway is too narrow to walk. */
  widen?: number
}

export interface Layout {
  station: string
  campfire: { x: number; z: number; r: number }
  player?: { x: number; z: number }
  /** walkable radius from the region origin; absent = the camp's classic 24 */
  bound?: number
  /** Where this region hands the traveller on to the next one. Walking into an
      exit circle carries you into `to`, and you arrive standing at that
      region's matching exit — so the road really does run from Yemen to Mecca
      and the journey is walked rather than jumped. `label` is what the prompt
      says before you step through. */
  exits?: { to: string; x: number; z: number; r: number; label: string }[]
  /** The region's hour and weather. Two regions dressed from the same asset
      library under the same sky read as the same place however differently
      they are laid out, so every region states its own light. Absent = the
      dusk rig the night camp and border post share. */
  mood?: {
    /** panorama under /assets/chapter1/tex */
    sky?: string
    /** how hard the painted sky lights the scene (LDR, so usually < 1) */
    skyLight?: number
    fog?: { color: string; near: number; far: number }
    /** JSON gives us number[]; the light wants a fixed triple, so the engine
        narrows it at the point of use rather than forcing every layout file to
        be typed by hand. */
    sun?: { position: number[]; color: string; intensity: number }
    /** hemisphere fill: sky colour, ground bounce colour, intensity */
    fill?: { sky: string; ground: string; intensity: number }
    /** Soft light from behind the viewer, so a face turned toward the player is
        readable when the sun is behind it. It has to stay well under `fill`
        and `skyLight`: a viewer light stronger than the region's own indirect
        light stops filling the scene and starts erasing it, and every region
        ends up the same flat photograph. Absent = 0.42. */
    viewerFill?: number
    exposure?: number
    /** Illustration strength — how hard the light-band shader quantizes.
        0 turns the painterly pass off entirely. Absent = 0.7. */
    paint?: number
    /** CSS filter applied to the canvas — the region's colour grade.
        Absent = the shared warm grade. */
    grade?: string
    /** Corner-darkening opacity, 0..1. The frame that closes the frame.
        Absent = 0.34. */
    vignette?: number
  }
  /** The painted minimap plate for this region, under public/assets/chapter1/tex.
      A region without one shows pins on plain parchment. */
  map?: string
  /** Worn tracks on the sand. Two shapes: a straight strip (`x,z,ry,len`) or a
      wandering ribbon (`pts` centreline, Catmull-Rom, tapered ends) — the
      ribbon is what new regions should use; straight strips read as carpets. */
  roads?: { x?: number; z?: number; ry?: number; len?: number; w: number; pts?: { x: number; z: number }[] }[]
  props: LayoutProp[]
  /** The night-camp's procedural rock/shrub ring. Regions dress themselves via
      props; only the camp still opts in, so absence means "off". */
  scatter?: boolean
  herd: { cx: number; cz: number; rx: number; rz: number; speed: number; phase: number; h: number }[]
  rugs: { x: number; z: number; ry: number }[]
  scrolls: { x: number; z: number }[]
  terrain?: {
    model: string
    span: number
    campLocal: { x: number; z: number }
    flatInner: number
    flatOuter: number
    baked: boolean
    hasImage: boolean
    tint?: string
    /** Which ground surface this region stands on, under /assets/chapter1/tex.
        The ground owns the bottom two thirds of the frame, so two regions on
        the same texture read as the same place however differently they are
        built — this is the strongest identity a region has. */
    ground?: string
    /** how many times that texture tiles across the terrain */
    repeat?: number
    /** How the land stands outside the walkable circle: `amp` metres of rise,
        `wave` metres between ridges. The played ground stays level — this is
        the country the region sits in, and it is what tells a highland from a
        pass from a plain at a glance. */
    relief?: { amp: number; wave: number }
  }
}

/* In journey order, south to north: the table is the itinerary. */
export const LAYOUTS: Record<string, Layout> = {
  'yemen-heights': yemenLayout,
  'night-camp': campLayout,
  'border-post': borderLayout,
  'narrow-pass': passLayout,
  'loading-road': roadLayout,
  yathrib: yathribLayout,
  monastery: monasteryLayout,
  mecca: meccaLayout,
  exit: exitLayout,
}

/** Regions that can actually be walked today, in journey order. */
export const PLAYABLE = Object.keys(LAYOUTS)

export function layoutFor(regionId: string): Layout | null {
  return LAYOUTS[regionId] ?? null
}
