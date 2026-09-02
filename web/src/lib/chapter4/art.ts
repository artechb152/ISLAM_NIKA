/* Chapter 4 — the geometry behind the two drawn devices.

   IN CODE, NOT IN AN IMAGE ENGINE. The review board settled this for chapter 6
   and the reasons carry over unchanged: a map has to be right about direction,
   which is arithmetic; a generated picture invents Arabic lettering, which the
   board forbade; and a drawing made of tokens stays in the palette when the
   palette moves. See MAGNIFIC_IMAGE_PROMPTS.md.

   NO LABEL IS DRAWN INSIDE THE SVG. Hebrew text in SVG flows right-to-left from
   its x and that trap has already cost this project a labelling bug — chapter 3
   dropped SVG entirely because of it. Here the geometry is SVG and every label
   is an HTML element positioned over it in percent, so the two never argue. */

export interface Place {
  id: string
  /** the source's own spelling — never a name this file composes */
  name: string
  lat: number
  lon: number
  /** the year the chapter attaches to it, where the source gives one */
  year?: string
}

/* Coordinates are the real places. They are the one thing on the page that does
   not come from the booklet, and they are not content: they decide where a dot
   sits, not what the chapter says. */
export const PLACES: Place[] = [
  { id: 'mecca', name: 'מכה', lat: 21.4225, lon: 39.8262 },
  { id: 'hudaybiyyah', name: 'חודיביה', lat: 21.45, lon: 39.63, year: '628' },
  { id: 'badr', name: 'בדר', lat: 23.78, lon: 38.79, year: '624' },
  { id: 'medina', name: 'מדינה', lat: 24.4686, lon: 39.6142, year: '622' },
  { id: 'khaybar', name: "ח'יבר", lat: 25.698, lon: 39.292 },
]

/* UHUD IS NOT ON THIS MAP, on purpose. The mountain is about five kilometres
   from Medina; on a strip five hundred kilometres tall its dot lands inside
   Medina's. Pinning it would claim a resolution the drawing does not have, and
   the section's own sentence already places it — „בהר אחד, צפונית למדינה". */

const LAT_MIN = 21.3
const LAT_MAX = 25.82
const LON_MIN = 38.65
const LON_MAX = 39.95
/* equirectangular, with longitude squeezed by cos(mid-latitude) so that a
   degree east is drawn shorter than a degree north, which is what it is */
const COS_MID = Math.cos((((LAT_MIN + LAT_MAX) / 2) * Math.PI) / 180)

/** 0 = the map's right edge... no: 0 = west edge, 1 = east edge. The RTL flip
    belongs to CSS, not to the arithmetic. */
export const px = (lon: number): number =>
  ((lon - LON_MIN) * COS_MID) / ((LON_MAX - LON_MIN) * COS_MID)

/** 0 = north edge, 1 = south edge — screen order, so it can be used directly. */
export const py = (lat: number): number => (LAT_MAX - lat) / (LAT_MAX - LAT_MIN)

/** great-circle kilometres, for the one claim the source makes about distance:
    „למעלה מ-300 ק"מ צפונית לעיר מכה". The gate below keeps that honest. */
export function km(a: Place, b: Place): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const la = (a.lat * Math.PI) / 180
  const lb = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const at = (id: string): Place => {
  const p = PLACES.find((x) => x.id === id)
  if (!p) throw new Error(`chapter 4: unknown place ${id}`)
  return p
}

/* The road the chapter walks: Mecca in the south, Medina in the north, and the
   three places the years hang on. Drawn as one line because the chapter is one
   journey out and one journey back. */
export const ROUTE = ['mecca', 'badr', 'medina', 'khaybar'].map(at)

/** Mecca → Medina in kilometres, rounded. Read by the map's own assertion and
    by the gate, so the drawing cannot quietly contradict the sentence beside
    it. */
export const MECCA_TO_MEDINA = Math.round(km(at('mecca'), at('medina')))

/* ---------------- label placement ----------------

   THE PROBLEM THIS SOLVES. Mecca sits at 97.3% down the strip and Hudaybiyyah
   at 96.7% — twenty kilometres apart on a map five hundred kilometres tall,
   which is three pixels. Their labels would print on top of each other. The
   answer is not to move the dots, which would be a lie about where the places
   are, but to move the LABELS and draw a leader line back to the dot it names.

   One pass, top to bottom: keep each label at its dot's height unless that puts
   it inside the previous label's line, in which case push it down by exactly
   the gap needed and no more. */
export interface Label {
  place: Place
  /** where the dot really is, 0..1 down the strip */
  dotY: number
  /** where its name is printed, 0..1 — the same unless it had to be pushed */
  labelY: number
}

export function layoutLabels(stripPx: number, minGapPx = 34): Label[] {
  const sorted = [...PLACES].sort((a, b) => py(a.lat) - py(b.lat))
  const out: Label[] = []
  let lastPx = -Infinity
  for (const place of sorted) {
    const dotY = py(place.lat)
    const wantPx = dotY * stripPx
    const gotPx = Math.max(wantPx, lastPx + minGapPx)
    lastPx = gotPx
    out.push({ place, dotY, labelY: gotPx / stripPx })
  }
  return out
}

/* THE COORDINATES AND THE SENTENCE CHECK EACH OTHER. §1 says Yathrib is „למעלה
   מ-300 ק"מ צפונית לעיר מכה". The coordinates give 339. If someone edits a
   latitude and the two stop agreeing, the chapter fails to load rather than
   drawing a map that quietly contradicts the paragraph beside it. */
if (MECCA_TO_MEDINA <= 300) {
  throw new Error(
    `chapter 4: the map puts Mecca ${MECCA_TO_MEDINA} km from Medina, but §1 says more than 300`,
  )
}
