import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')

const start = s.indexOf('/* ---------------- mechanism · the trench ----------------')
const anchor = '\n/** A plate: one painted view'
const end = s.indexOf(anchor, start)
if (start < 0 || end < 0) throw new Error('trench block not found')

const replacement = `/* ---------------- mechanism · the trench ----------------

   THE ONLY BATTLE IN THE CHAPTER WHOSE IDEA IS A SHAPE. Badr and Uhud are
   numbers — three hundred against a thousand, a thousand against three thousand
   — and the force balance carries them. The trench is geometry: a Persian
   advised a ditch on the side the city was open on, the technique was not one
   the Arabs used, and the siege broke on it. Read as prose that is a clause
   inside a thirty-eight-word sentence; seen, it is the whole event.

   IT WAS AN SVG FIRST, AND THE SVG WAS BAD. A blob for the town, empty rounded
   rectangles for its houses, a ladder for the ditch and three chevrons for an
   army — a programmer's schematic dropped into the middle of a chapter that is
   otherwise painted. It is drawn now, in the same hand as the other seven
   plates, and the drawing does what the schematic was trying to say: the town
   among its palms behind, the cut across the open ground in front, the empty
   plain beyond it.

   WHAT IT DOES NOT CLAIM. The source says the ditch was dug „סביבות העיר מדינה
   מצפונה לו" and nothing more. It does not say what protected the other sides —
   the lava fields and palm groves the histories give are not in this booklet —
   so the view shows one cut and one open plain, and the rest of the town's edge
   is simply not in frame. No compass label either: „צפון" is not a word of the
   sentence, „מצפונה" is, and it is doing that work in the caption below.

   NO LABELS ON THE PICTURE. The three the schematic carried — city, ditch,
   besiegers — were each proved to be words of §24 before they were printed, and
   they are still all named in the sentence underneath. Set over the painting
   they would only be a schematic wearing a landscape. */
function Trench({ r }: { r: string }) {
  return (
    <figure className="ch4-trench" data-reveal>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="ch4-trench-plate"
        src="/assets/chapter4/trench.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
      <figcaption className="ch4-trench-text">
        <T r={r} className="ch4-body" />
      </figcaption>
    </figure>
  )
}
`
s = s.slice(0, start) + replacement + s.slice(end)
fs.writeFileSync(p, s)
console.log('trench replaced with the plate')
